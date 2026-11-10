import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { downloadLinkEmail, downloadLinkExpiry, TOKEN_PATTERN } from "./download-links";
import { emailCreatorFirstDownload, hashLinkToken, newLinkToken } from "./download-links.server";
import { sendReviewEmail } from "./review-emails.server";
import { siteOrigin } from "./site-origin.server";

const requestSchema = z.object({
  guideId: z.string().uuid(),
  name: z.string().trim().min(1, "Please enter your name.").max(100, "Name is too long."),
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  website: z.string().max(200).optional(),
});

const tokenSchema = z.object({ token: z.string().regex(TOKEN_PATTERN, "This link isn’t valid.") });

/** The signed-in caller, if any (the form also works for guests). */
async function optionalUserId() {
  const header = getRequestHeader("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

/**
 * A visitor enters their name and email to get a free resource; Doerly records the
 * claim and emails them a personal download link.
 */
export const requestResourceByEmail = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof requestSchema>) => {
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please check the form.");
    return parsed.data;
  })
  .handler(async ({ data }): Promise<{ ok: true; email: string } | { ok: false; error: string }> => {
    // Bots fill the hidden field; pretend success without doing anything.
    if (data.website) return { ok: true, email: data.email };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buyerId = await optionalUserId();
    const { token, hash } = await newLinkToken();
    // Free resources only for now; paid links are issued after payment (see issue_paid_download).
    const expiresAt = downloadLinkExpiry(0);
    const { data: issued, error } = await supabaseAdmin.rpc("issue_free_download", {
      p_guide_id: data.guideId,
      p_name: data.name,
      p_email: data.email,
      // Null when the visitor isn’t signed in (generated types don’t mark it optional).
      p_buyer_id: buyerId as string,
      p_token_hash: hash,
      p_expires_at: (expiresAt?.toISOString() ?? null) as string,
    });
    if (error) return { ok: false, error: error.message };
    const info = issued as { link_id: string; title: string; expires_at: string | null };

    const sent = await sendReviewEmail(
      data.email,
      downloadLinkEmail({
        name: data.name,
        title: info.title,
        url: `${siteOrigin()}/get/${token}`,
        expiresAt: info.expires_at,
      }),
      `download-link-${info.link_id}`,
    );
    if (!sent.sent) {
      return { ok: false, error: "We couldn’t send the email right now. Please try again in a few minutes." };
    }
    await supabaseAdmin
      .from("download_links")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", info.link_id);
    return { ok: true, email: data.email.toLowerCase() };
  });

export type DownloadLinkInfo =
  | { status: "ok"; title: string; slug: string | null; expiresAt: string | null; remaining: number }
  | { status: "expired" | "limit" | "not_found"; title: string | null; slug: string | null };

/** What the emailed link points at, without using up a download. */
export const getDownloadLinkInfo = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => tokenSchema.parse(input))
  .handler(async ({ data }): Promise<DownloadLinkInfo> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("download_links")
      .select("expires_at, download_count, max_downloads, version_id, guide_id")
      .eq("token_hash", await hashLinkToken(data.token))
      .maybeSingle();
    if (!link) return { status: "not_found", title: null, slug: null };
    const [{ data: version }, { data: guide }] = await Promise.all([
      supabaseAdmin.from("guide_versions").select("title").eq("id", link.version_id).maybeSingle(),
      supabaseAdmin.from("guides").select("slug, status").eq("id", link.guide_id).maybeSingle(),
    ]);
    const title = version?.title ?? null;
    const slug = guide?.status === "published" ? guide.slug : null;
    if (link.expires_at && Date.parse(link.expires_at) <= Date.now()) return { status: "expired", title, slug };
    if (link.download_count >= link.max_downloads) return { status: "limit", title, slug };
    return {
      status: "ok",
      title: title ?? "Your resource",
      slug,
      expiresAt: link.expires_at,
      remaining: link.max_downloads - link.download_count,
    };
  });

const LINK_SECONDS = 60;

/** Uses one download from the emailed link and returns a one-minute file address. */
export const downloadFromLink = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => tokenSchema.parse(input))
  .handler(async ({ data }): Promise<{ url: string } | { error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("consume_download_link", {
      p_token_hash: await hashLinkToken(data.token),
    });
    if (error) {
      console.error("consume_download_link failed", error);
      return { error: "We couldn’t start the download. Please try again." };
    }
    const r = result as {
      outcome: string;
      file_path?: string;
      file_name?: string | null;
      guide_id?: string;
      first_for_guide?: boolean;
    };
    if (r.outcome === "expired") return { error: "This download link has expired." };
    if (r.outcome === "limit") return { error: "This link has reached its download limit." };
    if (r.outcome !== "ok" || !r.file_path) return { error: "This download is no longer available." };

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("creator-guides")
      .createSignedUrl(r.file_path, LINK_SECONDS, { download: r.file_name ?? true });
    if (signError || !signed) return { error: "We couldn’t prepare the file. Please try again." };

    if (r.first_for_guide && r.guide_id) {
      try {
        await emailCreatorFirstDownload(r.guide_id, siteOrigin());
      } catch (e) {
        console.error("first-download email failed", e);
      }
    }
    return { url: signed.signedUrl };
  });
