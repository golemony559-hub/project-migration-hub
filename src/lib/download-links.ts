/** Browser-safe rules and email content for emailed download links. */
import { buildEmail } from "./review-emails";

/** Links for paid products stop working this many hours after they are sent. */
export const PAID_LINK_HOURS = 6;

/** When an emailed link stops working: never for free products, 6 hours after sending for paid ones. */
export function downloadLinkExpiry(priceCents: number, now: Date = new Date()): Date | null {
  if (priceCents <= 0) return null;
  return new Date(now.getTime() + PAID_LINK_HOURS * 60 * 60 * 1000);
}

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;

function formatExpiry(iso: string) {
  return new Date(iso).toUTCString().replace("GMT", "UTC");
}

export function downloadLinkEmail(p: {
  name: string;
  title: string;
  url: string;
  expiresAt: string | null;
}) {
  const paragraphs = [
    `Hi ${p.name},`,
    `Here is your download link for “${p.title}”. Open it and press Download to save the file.`,
    p.expiresAt
      ? `For your security this link works for ${PAID_LINK_HOURS} hours — until ${formatExpiry(p.expiresAt)}.`
      : "Keep this email so you can download it again later.",
    "If you didn’t ask for this, you can ignore this email.",
  ];
  return buildEmail(`Your download: ${p.title}`, "Your resource is ready", paragraphs, {
    label: "Download your resource",
    url: p.url,
  });
}

export function creatorFirstDownloadEmail(p: {
  creatorName: string;
  title: string;
  guideId: string;
  origin: string;
}) {
  return buildEmail(
    `First download: “${p.title}”`,
    "Someone just downloaded your product",
    [
      `Hi ${p.creatorName},`,
      `Great news — “${p.title}” was downloaded for the first time.`,
      "You can follow purchases and downloads for each product in your creator dashboard.",
    ],
    { label: "See your product", url: `${p.origin}/dashboard/products/${p.guideId}` },
  );
}
