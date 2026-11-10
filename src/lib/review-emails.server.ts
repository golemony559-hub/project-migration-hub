import { REVIEW_EMAIL_FROM, type ReviewEmail } from "./review-emails";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export type SendResult = { sent: true } | { sent: false; error: string };

/** Sends one email to one recipient through the Resend connection. */
export async function sendReviewEmail(
  to: string,
  email: ReviewEmail,
  idempotencyKey: string,
): Promise<SendResult> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) {
    console.error("review email not sent: email connection is not configured");
    return { sent: false, error: "Email isn’t configured." };
  }
  try {
    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
        "Idempotency-Key": idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from: REVIEW_EMAIL_FROM,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`review email failed [${response.status}]: ${body}`);
      return { sent: false, error: `Email provider error ${response.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error("review email network error", error);
    return { sent: false, error: "Email provider unreachable" };
  }
}
