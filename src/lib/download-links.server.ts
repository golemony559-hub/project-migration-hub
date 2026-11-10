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

/**
 * For paid checkout (once a payment provider is connected): after a payment is confirmed,
 * email the buyer a download link that works for PAID_LINK_HOURS hours.
 */
export async function sendPaidDownloadLink(orderId: string, origin: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { downloadLinkEmail, downloadLinkExpiry } = await import("./download-links");
  const { token, hash } = await newLinkToken();
  const { data, error } = await supabaseAdmin.rpc("issue_paid_download", {
    p_order_id: orderId,
    p_token_hash: hash,
    p_expires_at: downloadLinkExpiry(1)!.toISOString(),
  });
  if (error) throw new Error(error.message);
  const info = data as { link_id: string; title: string; expires_at: string; email: string; name: string };
  const sent = await sendReviewEmail(
    info.email,
    downloadLinkEmail({ name: info.name || "there", title: info.title, url: `${origin}/get/${token}`, expiresAt: info.expires_at }),
    `download-link-${info.link_id}`,
  );
  if (sent.sent) {
    await supabaseAdmin.from("download_links").update({ email_sent_at: new Date().toISOString() }).eq("id", info.link_id);
  }
  return sent;
}
