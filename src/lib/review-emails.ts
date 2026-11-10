/** Browser-safe content for product review emails (sent through Resend). */

export const REVIEW_EMAIL_FROM = "Doerly <doerly@myjoyfullday.site>";
export const ADMIN_REVIEW_EMAIL = "otienoalvine925@gmail.com";

export type ReviewEmail = { subject: string; html: string; text: string };

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(heading: string, paragraphs: string[], cta: { label: string; url: string }) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1f3640">${escapeHtml(p)}</p>`)
    .join("");
  return `<!doctype html><html lang="en"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 24px">
<p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#0f4152">Doerly</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f4152">${escapeHtml(heading)}</h1>
${body}
<p style="margin:22px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:11px 18px;border-radius:6px;background:#0f4152;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none">${escapeHtml(cta.label)}</a></p>
<p style="margin:28px 0 0;font-size:12px;color:#6b7f86">Doerly · Learn it from someone who’s done it.</p>
</div></body></html>`;
}

const text = (heading: string, paragraphs: string[], cta: { label: string; url: string }) =>
  [heading, "", ...paragraphs, "", `${cta.label}: ${cta.url}`].join("\n");

function build(subject: string, heading: string, paragraphs: string[], cta: { label: string; url: string }): ReviewEmail {
  return { subject, html: layout(heading, paragraphs, cta), text: text(heading, paragraphs, cta) };
}

export function adminReviewRequestEmail(p: {
  title: string;
  creatorName: string;
  category: string;
  version: number;
  origin: string;
}) {
  return build(
    `New product to review: ${p.title}`,
    "A product is waiting for your review",
    [
      `${p.creatorName} submitted “${p.title}” (version ${p.version}, ${p.category}) for review.`,
      "Open the review queue to approve it, request changes or decline it.",
    ],
    { label: "Open review queue", url: `${p.origin}/admin?tab=review` },
  );
}

export function creatorSubmittedEmail(p: { title: string; creatorName: string; guideId: string; origin: string }) {
  return build(
    `We received “${p.title}”`,
    "Thanks — your product is in review",
    [
      `Hi ${p.creatorName},`,
      `We received “${p.title}” and it is now pending review. An admin will approve it, request changes or leave a comment, and we’ll email you as soon as they decide.`,
      "You can withdraw it from review at any time if you want to make more edits.",
    ],
    { label: "View your product", url: `${p.origin}/dashboard/products/${p.guideId}` },
  );
}

type WelcomePart = { heading: string; paragraphs?: string[]; bullets?: string[] };

/** The detailed welcome sent once a creator finishes onboarding. */
export function creatorWelcomeEmail(p: { creatorName: string; origin: string }): ReviewEmail {
  const helpUrl = `${p.origin}/creator-help`;
  const newProductUrl = `${p.origin}/dashboard/products/new`;
  const intro = [
    `Hi ${p.creatorName},`,
    "Welcome to Doerly — your creator profile is set up. People come here with real problems and look for know-how from someone who has actually done the work. That’s you.",
    "Here’s everything you need to publish your first product.",
  ];
  const parts: WelcomePart[] = [
    {
      heading: "1. Add your first product",
      bullets: [
        "Open your dashboard and press “Add new product”.",
        "Upload your file (PDF, Word, Excel, ZIP, video, audio and more — up to 500 MB) and a thumbnail (PNG, JPG or WebP, up to 5 MB).",
        "Give it a specific name, say who it’s for and what problem it solves, and list what buyers will gain — one benefit per line.",
        "Choose Free or Paid. Paid checkout is coming soon; your price is saved and shown on your page.",
      ],
    },
    {
      heading: "2. Let AI draft the listing (optional)",
      paragraphs: [
        "At the top of the form, use “Fill everything in with AI”. Describe your product in a few sentences and it drafts every field in your voice. Nothing is saved until you check it and press save — remove anything that isn’t true.",
      ],
    },
    {
      heading: "3. Submit for review",
      paragraphs: [
        "A Doerly admin checks each product against six quality checks: a clear problem and audience, real practical value, honest claims, sources and cautions where needed, a listing that matches the file, and rights to share it. We’ll email you when you submit and again when it’s approved.",
      ],
    },
    {
      heading: "4. Go live and share",
      paragraphs: [
        "Approved products get their own page you can share on WhatsApp, social media or your website. Add a “Buy me a coffee” link in Settings so readers of your free products can thank you.",
      ],
    },
    {
      heading: "Good to know",
      bullets: [
        "Your drafts and files stay private until a product is approved.",
        "Saved details are locked until you press Edit, so nothing changes by accident.",
        "Updating a live product creates a new version — your page stays up until the update is approved.",
        "Money, animal-health and electrical or gas topics need sources, dates and safety limits, and get an extra specialist review.",
      ],
    },
  ];
  const outro =
    "The creator help page walks through every field, the review process, pricing, earnings and common problems in detail. Keep it handy.";

  const para = (t: string) =>
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f3640">${escapeHtml(t)}</p>`;
  const partHtml = (part: WelcomePart) =>
    `<h2 style="margin:24px 0 8px;font-size:16px;line-height:1.35;color:#0f4152">${escapeHtml(part.heading)}</h2>` +
    (part.paragraphs ?? []).map(para).join("") +
    (part.bullets
      ? `<ul style="margin:0 0 12px;padding-left:20px">${part.bullets
          .map((b) => `<li style="margin:0 0 6px;font-size:15px;line-height:1.55;color:#1f3640">${escapeHtml(b)}</li>`)
          .join("")}</ul>`
      : "");
  const button = (label: string, url: string) =>
    `<p style="margin:22px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:11px 18px;border-radius:6px;background:#0f4152;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none">${escapeHtml(label)}</a></p>`;

  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 24px">
<p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#0f4152">Doerly</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f4152">Welcome to Doerly, ${escapeHtml(p.creatorName)}</h1>
${intro.map(para).join("")}
${button("Open the creator help page", helpUrl)}
${parts.map(partHtml).join("")}
<p style="margin:24px 0 12px;font-size:15px;line-height:1.6;color:#1f3640">${escapeHtml(outro)}</p>
${button("Open the creator help page", helpUrl)}
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#1f3640">Ready now? <a href="${escapeHtml(newProductUrl)}" style="color:#0f4152;font-weight:700">Add your first product</a>.</p>
<p style="margin:28px 0 0;font-size:12px;color:#6b7f86">Doerly · Learn it from someone who’s done it.</p>
</div></body></html>`;

  const text = [
    `Welcome to Doerly, ${p.creatorName}`,
    "",
    ...intro,
    "",
    `Open the creator help page: ${helpUrl}`,
    ...parts.flatMap((part) => [
      "",
      part.heading,
      ...(part.paragraphs ?? []),
      ...(part.bullets ?? []).map((b) => `- ${b}`),
    ]),
    "",
    outro,
    `Creator help page: ${helpUrl}`,
    `Add your first product: ${newProductUrl}`,
  ].join("\n");

  return { subject: "Welcome to Doerly — your creator guide", html, text };
}

export function creatorApprovedEmail(p: {
  title: string;
  creatorName: string;
  slug: string;
  reason: string;
  origin: string;
}) {
  const paragraphs = [
    `Hi ${p.creatorName},`,
    `Good news — “${p.title}” was approved and is now live on Doerly.`,
  ];
  if (p.reason.trim()) paragraphs.push(`Reviewer note: ${p.reason.trim()}`);
  return build(`Approved: “${p.title}” is live`, "Your product is live", paragraphs, {
    label: "See your live page",
    url: `${p.origin}/guide/${p.slug}`,
  });
}

export { build as buildEmail };
