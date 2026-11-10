import { creatorFirstDownloadEmail } from "./download-links";
import { sendReviewEmail } from "./review-emails.server";

/** A new random link token (URL-safe) and the hash that is stored instead of it. */
export async function newLinkToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const token = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { token, hash: await hashLinkToken(token) };
}

export async function hashLinkToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Emails the creator once when their product is downloaded for the first time. */
export async function emailCreatorFirstDownload(guideId: string, origin: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: guide } = await supabaseAdmin
    .from("guides")
    .select("id, title, creator_id")
    .eq("id", guideId)
    .maybeSingle();
  if (!guide) return;
  const [{ data: account }, { data: profile }] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(guide.creator_id),
    supabaseAdmin.from("profiles").select("display_name").eq("id", guide.creator_id).maybeSingle(),
  ]);
  const to = account.user?.email;
  if (!to) return;
  await sendReviewEmail(
    to,
    creatorFirstDownloadEmail({
      creatorName: profile?.display_name || "there",
      title: guide.title,
      guideId: guide.id,
      origin,
    }),
    `first-download-${guide.id}`,
  );
}
