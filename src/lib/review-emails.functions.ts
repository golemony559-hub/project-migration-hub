import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ADMIN_REVIEW_EMAIL,
  adminReviewRequestEmail,
  creatorApprovedEmail,
  creatorSubmittedEmail,
  creatorWelcomeEmail,
} from "./review-emails";
import { sendReviewEmail } from "./review-emails.server";
import { isCreatorOnboarded } from "./creator-status";
import { siteOrigin } from "./site-origin.server";
import { runQualityCheckFor } from "./quality-check.server";

const validateVersion = (input: { versionId: string }) => {
  if (typeof input?.versionId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.versionId)) {
    throw new Error("Invalid request.");
  }
  return { versionId: input.versionId };
};

type Outcome = { admin: boolean; creator: boolean };

/** After a creator submits: email the admin to review it and send the creator an acknowledgement. */
export const sendSubmissionEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateVersion)
  .handler(async ({ data, context }): Promise<Outcome> => {
    const { supabase, userId, claims } = context;
    const [{ data: v }, { data: profile }] = await Promise.all([
      supabase
        .from("guide_versions")
        .select("id, guide_id, title, category, version_number, state, submitted_at")
        .eq("id", data.versionId)
        .eq("creator_id", userId)
        .maybeSingle(),
      supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    ]);
    // Only a product that is really pending review triggers the emails.
    if (!v || v.state !== "in_review" || !v.submitted_at) return { admin: false, creator: false };
    const origin = siteOrigin();
    const creatorName = profile?.display_name ?? "A creator";
    const key = `${v.id}-${v.submitted_at}`;
    const creatorEmail = typeof claims["email"] === "string" ? claims["email"] : "";

    const [admin, creator] = await Promise.all([
      sendReviewEmail(
        ADMIN_REVIEW_EMAIL,
        adminReviewRequestEmail({
          title: v.title,
          creatorName,
          category: v.category,
          version: v.version_number,
          origin,
        }),
        `review-request-${key}`,
      ),
      creatorEmail
        ? sendReviewEmail(
            creatorEmail,
            creatorSubmittedEmail({ title: v.title, creatorName, guideId: v.guide_id, origin }),
            `review-received-${key}`,
          )
        : Promise.resolve({ sent: false as const, error: "No email on account" }),
    ]);
    // Automatic quality & originality check for the reviewer and the creator (best-effort).
    try {
      await runQualityCheckFor(v.id);
    } catch (e) {
      console.error("quality check failed", e);
    }
    return { admin: admin.sent, creator: creator.sent };
  });

/**
 * After a creator finishes onboarding: send the detailed welcome email (once per account)
 * with a link to the creator help page, plus an in-app notice.
 */
export const sendCreatorWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ sent: boolean }> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Read the account fresh: the caller's token can predate the onboarding acknowledgements.
    const [{ data: account }, { data: profile }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(userId),
      supabase.from("profiles").select("display_name, bio").eq("id", userId).maybeSingle(),
    ]);
    const user = account.user;
    if (!user?.email || !isCreatorOnboarded(user, profile)) return { sent: false };
    const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    if (appMeta["doerly_creator_welcome_sent_at"]) return { sent: false };

    const result = await sendReviewEmail(
      user.email,
      creatorWelcomeEmail({ creatorName: profile!.display_name.trim(), origin: siteOrigin() }),
      `creator-welcome-${userId}`,
    );
    if (!result.sent) return { sent: false };
    await Promise.all([
      supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: { ...appMeta, doerly_creator_welcome_sent_at: new Date().toISOString() },
      }),
      supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title: "Welcome to Doerly",
        body: "Your creator guide is in your inbox. The help page explains every step.",
        link: "/creator-help",
      }),
    ]);
    return { sent: true };
  });

/** After an admin approves: tell the creator their product is live. */
export const sendApprovalEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateVersion)
  .handler(async ({ data, context }): Promise<{ sent: boolean }> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: v } = await supabaseAdmin
      .from("guide_versions")
      .select("id, guide_id, creator_id, title, state, review_reason, reviewed_at")
      .eq("id", data.versionId)
      .maybeSingle();
    if (!v || v.state !== "approved") return { sent: false };
    const [{ data: guide }, { data: profile }, { data: account }] = await Promise.all([
      supabaseAdmin.from("guides").select("slug").eq("id", v.guide_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("display_name").eq("id", v.creator_id).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(v.creator_id),
    ]);
    const to = account.user?.email;
    if (!guide || !to) return { sent: false };
    const result = await sendReviewEmail(
      to,
      creatorApprovedEmail({
        title: v.title,
        creatorName: profile?.display_name ?? "there",
        slug: guide.slug,
        reason: v.review_reason ?? "",
        origin: siteOrigin(),
      }),
      `review-approved-${v.id}-${v.reviewed_at ?? ""}`,
    );
    return { sent: result.sent };
  });
