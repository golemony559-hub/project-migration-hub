// Content for the public creator help page (/creator-help). Keep it in step with
// the real dashboard: field names, limits and review states mirror the app.
import { legalContact } from "./policy-drafts";

export type HelpBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: string[] }
  | { kind: "tip"; title: string; text: string }
  | { kind: "warning"; title: string; text: string }
  | { kind: "table"; columns: [string, string]; rows: [string, string][] }
  | { kind: "link"; label: string; to: HelpLinkTarget };

export type HelpLinkTarget =
  | "/dashboard"
  | "/dashboard/products/new"
  | "/dashboard/products"
  | "/dashboard/profile"
  | "/dashboard/settings"
  | "/dashboard/analytics"
  | "/dashboard/transactions"
  | "/creator-rules"
  | "/terms"
  | "/privacy";

export type HelpSection = {
  id: string;
  title: string;
  summary: string;
  blocks: HelpBlock[];
};

export type HelpFaq = { question: string; answer: string };

export const CREATOR_HELP_PATH = "/creator-help";
export const CREATOR_HELP_UPDATED = "10 November 2026";
export const creatorSupportEmail = legalContact.supportEmail;

export const quickStart: { title: string; text: string }[] = [
  {
    title: "Verify your email",
    text: "Open the link we sent when you signed up. Creator tools unlock once your email is confirmed.",
  },
  {
    title: "Finish your creator profile",
    text: "Three short steps: who you are, what you know from experience, and the creator commitments.",
  },
  {
    title: "Add your first product",
    text: "Upload your file and a thumbnail, describe it honestly, and let the AI helper draft the listing if you like.",
  },
  {
    title: "Submit it for review",
    text: "An admin checks it against six quality checks — usually within 2 working days.",
  },
  {
    title: "Go live and share it",
    text: "Once approved, your product appears on Doerly with its own page you can share anywhere.",
  },
];

export const helpSections: HelpSection[] = [
  {
    id: "answering-questions",
    title: "Answer reader questions",
    summary: "Help readers understand your products before they buy.",
    blocks: [
      { kind: "p", text: "Open Questions in your dashboard to read and answer questions. Your answer is emailed to the reader. You can edit an answer later; saving it sends another email." },
      { kind: "p", text: "Choose ‘Also show this question and answer publicly on the product page’ to share it with other readers. Public questions show only the reader’s first name, never their email. Use Show publicly or Hide publicly to change visibility later." },
    ],
  },
  {
    id: "getting-started",
    title: "Getting started",
    summary: "Create your account, confirm your email and understand how Doerly works.",
    blocks: [
      {
        kind: "p",
        text: "Doerly is a marketplace for practical know-how. People arrive with a real problem — raising healthy chicks, pricing a cleaning business, fixing a leaking tap — and look for a guide, checklist, template or toolkit written by someone who has actually done it. As a creator, you turn what you know into a product that saves them time and mistakes.",
      },
      { kind: "h3", text: "Creating your account" },
      {
        kind: "steps",
        items: [
          "Go to the Creator page and choose Create a creator account.",
          "Sign up with your email and a password, or continue with Google or Lovable. Use an email you check often — review results and buyer notices go there.",
          "If you signed up with email, open the confirmation link we send you. Check your spam or promotions folder if it doesn’t arrive within a few minutes.",
          "Still nothing? On the Creator page, press Resend verification link. Each new link replaces the old one.",
        ],
      },
      {
        kind: "tip",
        title: "One account for everything",
        text: "The same account lets you buy and download other creators’ resources. Anything you get appears in your Library.",
      },
      { kind: "h3", text: "What a good Doerly product looks like" },
      {
        kind: "list",
        items: [
          "It solves one clear, practical problem for a specific person (for example: “first-time layer farmers with fewer than 200 birds”).",
          "It is based on your own hands-on experience, not a summary of what is already free online.",
          "It is complete for what it promises — the reader can follow it from start to finish.",
          "It says honestly where it stops: local rules, equipment, climate and situations it doesn’t cover.",
        ],
      },
    ],
  },
  {
    id: "onboarding",
    title: "Setting up your creator profile",
    summary: "The three onboarding steps, and why each one is required.",
    blocks: [
      {
        kind: "p",
        text: "Before you can add products, Doerly asks for three short steps. Your progress is saved after each step, so you can stop and come back later.",
      },
      { kind: "h3", text: "Step 1 — Profile basics" },
      {
        kind: "list",
        items: [
          "Display name: the name buyers see on your products. Your real name or a business name both work.",
          "Short introduction: two or three sentences about who you are and what you do day to day.",
          "Profile photo (optional): a secure link starting with https:// to a clear photo or logo.",
        ],
      },
      { kind: "h3", text: "Step 2 — Expertise and experience" },
      {
        kind: "list",
        items: [
          "Areas of expertise: choose every category you plan to publish in — for example Farming & food or Home & repair.",
          "Practical experience: describe what you have actually done, for how long and at what scale. “I’ve run a 300-bird layer farm in Nakuru since 2016” is far more useful to a buyer than “poultry expert”.",
        ],
      },
      {
        kind: "warning",
        title: "Keep claims honest",
        text: "Don’t list qualifications, certifications or results you can’t back up. Doerly shows your experience as self-described — reviewers decline products whose claims look inflated.",
      },
      { kind: "h3", text: "Step 3 — Creator commitments" },
      {
        kind: "p",
        text: "You confirm that you own or have permission to share the material you upload, and you acknowledge the Terms of Use, Privacy Notice and Creator Content Rules. When those documents change in a meaningful way, you’ll be asked to review them again the next time you open your dashboard.",
      },
      { kind: "link", label: "Read the Creator Content Rules", to: "/creator-rules" },
    ],
  },
  {
    id: "dashboard",
    title: "Finding your way around the dashboard",
    summary: "What each page of the creator dashboard is for.",
    blocks: [
      {
        kind: "table",
        columns: ["Page", "What you’ll find there"],
        rows: [
          [
            "Overview",
            "Your numbers at a glance (live products, pending review, needing attention, free claims, sales), quick actions, new notices and a feed of recent activity.",
          ],
          [
            "Products",
            "Every product you’ve created, with its current state. Open one to see its details, review history and actions.",
          ],
          ["Transactions", "Orders and free claims of your products, plus your payout history."],
          [
            "Analytics",
            "Free claims, sales, downloads and reader reviews — overall and broken down by product.",
          ],
          ["Settings", "Your “Buy me a coffee” tip link and your account details."],
          ["Profile", "The public creator profile buyers see next to your products."],
        ],
      },
      { kind: "h3", text: "Details are locked until you press Edit" },
      {
        kind: "p",
        text: "To prevent accidental changes, your saved profile, product details and settings are shown read-only. Press Edit (or Edit profile, Edit link) to change them, then Save. Cancel throws away anything you typed and puts the saved values back. The only exception is the new-product form, which is editable straight away.",
      },
      { kind: "link", label: "Open your dashboard", to: "/dashboard" },
    ],
  },
  {
    id: "create-product",
    title: "Creating a product",
    summary: "Every field on the new-product form, with tips for each.",
    blocks: [
      {
        kind: "steps",
        items: [
          "From the dashboard, press Add new product.",
          "Fill in the Basics: product name, overview, description, what buyers will gain, category and type.",
          "Choose Free or Paid in Pricing.",
          "Upload a thumbnail and your product file.",
          "Press Save as draft to finish later, or Submit for review when it’s ready.",
        ],
      },
      { kind: "h3", text: "The fields, one by one" },
      {
        kind: "table",
        columns: ["Field", "How to fill it in"],
        rows: [
          [
            "Product name (up to 120 characters)",
            "Say the outcome, not just the topic. “Healthy chicks: your first eight weeks” beats “Poultry guide”.",
          ],
          [
            "Overview / summary (up to 300)",
            "One or two sentences on the problem it solves and who it’s for. Shown on product cards and at the top of your page.",
          ],
          [
            "Description (up to 5,000)",
            "What it is, who it helps, what’s inside (chapters, sheets, templates), how long it takes to use, and what it doesn’t cover.",
          ],
          [
            "What buyers / readers will gain (up to 2,000)",
            "One benefit per line — each line becomes a bullet point. Keep them concrete: “Set up a brooder for under 5,000 KES”.",
          ],
          [
            "Category",
            "Where buyers will look for it: Business, Farming & food, Home & repair, Marketing, Money or Technology.",
          ],
          [
            "Type",
            "Guide, Ebook, Playbook, Checklist, Template, Toolkit, Spreadsheet / calculator, Video, Audio, Image pack or Course.",
          ],
          [
            "Sources, dates & cautions",
            "Appears for sensitive categories (for example Money). Say where the information comes from, when you last checked it, and any safety or legal limits.",
          ],
          [
            "Search tags (optional, up to 8)",
            "Words buyers would type, separated by commas: “chickens, brooder, poultry health”.",
          ],
        ],
      },
      { kind: "h3", text: "Thumbnail" },
      {
        kind: "p",
        text: "PNG, JPG or WebP, up to 5 MB. Square or 4:3 works best. Use a real photo of your work or a clean cover with a short, readable title. Avoid tiny text, stock images that don’t match the content and anything you don’t have the rights to.",
      },
      { kind: "h3", text: "Product file" },
      {
        kind: "p",
        text: "One file up to 500 MB. Accepted types: PDF, EPUB, Word (DOC, DOCX), PowerPoint (PPT, PPTX), Excel (XLS, XLSX), CSV, TXT, ZIP, video (MP4, MOV, WebM), audio (MP3, M4A, WAV) and images (PNG, JPG, WebP, GIF). Need to deliver several files? Put them in one ZIP with a short “Start here” document inside.",
      },
      {
        kind: "tip",
        title: "Uploading large files",
        text: "Files over 20 MB can take a few minutes on slower connections. Keep the page open until you see the confirmation — closing it cancels the upload.",
      },
      {
        kind: "p",
        text: "Your file is stored privately. Nobody can open it while it’s a draft or in review except you and the reviewing admin. After approval, buyers enter their name and email on your page and we email them a personal download link (links for paid products stop working after 6 hours).",
      },
      { kind: "link", label: "Add a new product", to: "/dashboard/products/new" },
    ],
  },
  {
    id: "ai-helper",
    title: "Using the AI writing helper",
    summary: "Let AI draft every listing field from your own notes — then check it.",
    blocks: [
      {
        kind: "p",
        text: "At the top of the product form you’ll find Fill everything in with AI. Describe your product in your own words (at least 30 characters — a few sentences is better) and press Fill in all fields. The helper drafts the name, overview, description, benefits, category, type, sources note and tags in your voice.",
      },
      { kind: "h3", text: "Getting a good result" },
      {
        kind: "list",
        items: [
          "Mention who it’s for, what problem it solves and what’s inside the file.",
          "Include your real experience: years, scale, location, what went wrong and what you learned.",
          "Say what it doesn’t cover, so the draft states honest limits.",
          "Example: “I’ve raised layer chickens for 12 years. This 40-page guide covers setting up a brooder, feeding chicks in the first eight weeks and spotting early illness. It’s for small farms in East Africa, not commercial broiler units.”",
        ],
      },
      { kind: "h3", text: "Nothing is saved until you say so" },
      {
        kind: "p",
        text: "The helper only fills in the form. Read every field, correct anything that isn’t true, and then press Save as draft or Submit for review. Changed your mind? Press Undo AI changes to put back what you had before.",
      },
      {
        kind: "warning",
        title: "You are responsible for the final text",
        text: "AI can invent details. Remove any claim, number or promise that isn’t in your product or your experience. Reviewers check that the listing matches the file.",
      },
      {
        kind: "p",
        text: "If the helper says it’s busy, wait a minute and try again. If it says AI credits have run out, you can still fill in the fields yourself — nothing else is affected.",
      },
    ],
  },
  {
    id: "pricing",
    title: "Pricing and tips",
    summary: "Free products, paid products and the “Buy me a coffee” button.",
    blocks: [
      {
        kind: "table",
        columns: ["Option", "How it works today"],
        rows: [
          [
            "Free",
            "Anyone can get it by entering their name and email — we email them the download link. Readers see a “Buy me a coffee” button on your page if you’ve added a tip link.",
          ],
          [
            "Paid",
            "Set a price in US dollars, minimum 1.00. Paid checkout is coming soon — your price is saved and shown on your page, but no payments are taken yet.",
          ],
        ],
      },
      { kind: "h3", text: "Setting up your tip link" },
      {
        kind: "steps",
        items: [
          "Create a tip page with Buy Me a Coffee, Ko-fi, PayPal.me or a similar service.",
          "In the dashboard, open Settings and press Add link.",
          "Paste the full link (starting with https://) and press Save.",
          "The button appears on all your free products. Clear the link and save to hide it again.",
        ],
      },
      {
        kind: "tip",
        title: "Pricing advice",
        text: "Many creators start with one free product to build trust and reviews, then publish a deeper paid version. Price by the time or money your product saves the buyer, not by page count.",
      },
    ],
  },
  {
    id: "review",
    title: "How review works",
    summary: "What happens after you press Submit for review, and what reviewers check.",
    blocks: [
      {
        kind: "p",
        text: "Every new product — and every update to a live product — is checked by a Doerly admin before it appears on the marketplace. When you submit, the admin team is alerted and you get an email confirming we received it. Most reviews are completed within 2 working days; risk-sensitive topics can take longer because they need a specialist.",
      },
      { kind: "h3", text: "Product states" },
      {
        kind: "table",
        columns: ["State", "What it means and what you can do"],
        rows: [
          ["Draft — editing", "Only you can see it. Edit freely, then submit when ready."],
          [
            "Draft — in review",
            "An admin is checking it. You can’t edit it now, but you can press Withdraw to edit to pull it back to draft.",
          ],
          [
            "Changes requested",
            "The reviewer wants specific fixes. Read their note under Review history, edit, and press Resubmit for review.",
          ],
          [
            "Rejected — private",
            "It can’t be published as it stands. The reason is in Review history. You can start a new version that addresses it.",
          ],
          [
            "Approved / Published",
            "Live on Doerly. You get an email with a link to your public page.",
          ],
          [
            "Earlier approved version",
            "An older version that has been replaced by a newer approved one. Buyers who already have it keep access.",
          ],
        ],
      },
      { kind: "h3", text: "The six quality checks" },
      {
        kind: "p",
        text: "Reviewers approve a product only when all six checks pass:",
      },
      {
        kind: "list",
        items: [
          "Specific problem and audience — it says who it’s for, the task or problem, the context, any prerequisites and its limits.",
          "Practical value and completeness — the promised material is really there, complete for its stated scope and usable, not padded generic text.",
          "Creator context and claims — your experience is described accurately, nothing self-described is presented as verified, and there are no guaranteed outcomes.",
          "Evidence, currency and safe use — important claims have sources, dates, context or cautions.",
          "Listing fidelity and delivery — the name, thumbnail, type, contents, file and price match the listing; files open and tools work.",
          "Rights, originality and disclosure — you have the right to share it, and AI help or third-party material is disclosed.",
        ],
      },
      { kind: "h3", text: "Risk-sensitive topics" },
      {
        kind: "p",
        text: "Advice about money, tax or investments, animal health or veterinary treatment, and electrical, gas or structural work can cause real harm if it’s wrong. These products need clear sources, dates and limits, say when to call a licensed professional, and go through an extra specialist review before approval.",
      },
      { kind: "h3", text: "Most common reasons for “changes requested”" },
      {
        kind: "list",
        items: [
          "The description promises more than the file contains.",
          "The file won’t open, is password-protected, or is a different file from the one described.",
          "The audience is too broad (“for everyone”) or the problem is vague.",
          "Results are guaranteed (“double your harvest”) or experience is overstated.",
          "Copied text, images or templates without permission or credit.",
          "Missing sources, dates or safety limits on a sensitive topic.",
        ],
      },
    ],
  },
  {
    id: "updating",
    title: "Updating, hiding and managing live products",
    summary: "Edit a published product without taking it offline.",
    blocks: [
      {
        kind: "steps",
        items: [
          "Open the product from Products and press Edit product.",
          "A new version is created. Your live page stays exactly as it is while you work.",
          "Make your changes and submit the update for review.",
          "When the update is approved it replaces the live version. If it isn’t, the current live version stays up.",
        ],
      },
      {
        kind: "p",
        text: "Buyers who already have your product keep access, and the downloads in their Library follow the current approved file.",
      },
      { kind: "h3", text: "Unlisting a product" },
      {
        kind: "p",
        text: "Need to take a product off the marketplace for a while — for example while prices or regulations change? Open it and press Unlist. It disappears from search and browsing, people who already have it keep access, and you can press Relist at any time.",
      },
      { kind: "link", label: "Manage your products", to: "/dashboard/products" },
    ],
  },
  {
    id: "buyers",
    title: "What buyers see and do",
    summary: "Your product page, claiming, downloads and reviews.",
    blocks: [
      {
        kind: "list",
        items: [
          "Your product page shows the name, thumbnail, overview, description, benefits, type, price and your creator profile.",
          "Buyers enter their name and email and press “Email me the download link”. No account is needed; signed-in buyers also find it in their Library.",
          "Each buyer gets a personal link by email. Links for paid products stop working after 6 hours. You get a notice and an email the first time your product is downloaded.",
          "Buyers who have your product can leave feedback. Reviews are moderated before they appear.",
          "Buyers can report a broken file or a big mismatch with the listing. Doerly support will contact you, and you’re expected to help fix it.",
        ],
      },
      {
        kind: "tip",
        title: "Share your page",
        text: "Each live product has its own address. Share it on WhatsApp groups, social media, your website or in a newsletter — it shows a preview with your title and summary.",
      },
    ],
  },
  {
    id: "earnings",
    title: "Analytics, transactions and earnings",
    summary: "Understanding your numbers and how payouts will work.",
    blocks: [
      {
        kind: "table",
        columns: ["Number", "What it counts"],
        rows: [
          ["Purchases", "People who got your product — free claims plus paid orders."],
          ["Downloads", "Times your file was downloaded, from emailed links and Libraries."],
          ["Sales", "Confirmed paid orders (once paid checkout is switched on)."],
          ["Downloads", "Times your files were opened through a secure download link."],
          ["Reader reviews", "Approved feedback from people who have your product."],
        ],
      },
      { kind: "h3", text: "Earnings and payouts" },
      {
        kind: "p",
        text: "When paid sales start, each sale is recorded in your earnings with the gross sale, the platform fee and payment processing shown separately. New sales are held as pending for a short period (to cover refunds), then become available for payout. Fees, payout schedules and supported payout methods will be published at least 30 days before paid checkout opens.",
      },
      {
        kind: "warning",
        title: "Paid checkout isn’t live yet",
        text: "Right now no money changes hands on Doerly. Your Transactions page shows free claims; tips go directly to your own tip page.",
      },
      { kind: "link", label: "View your analytics", to: "/dashboard/analytics" },
    ],
  },
  {
    id: "notifications",
    title: "Emails and notices",
    summary: "What we’ll tell you, and where.",
    blocks: [
      {
        kind: "table",
        columns: ["When", "What you receive"],
        rows: [
          ["You finish your creator profile", "A welcome email with a link to this help page."],
          ["You submit a product", "An email and an in-app notice: “We received your product”."],
          ["An admin approves it", "An email with a link to your live page, plus any reviewer note."],
          [
            "Changes are requested or it’s declined",
            "An in-app notice; the full reasons are under Review history on the product.",
          ],
        ],
      },
      {
        kind: "p",
        text: "In-app notices appear at the top of your Overview under New notices. Dismiss each one once you’ve read it. Emails come from doerly@myjoyfullday.site — add it to your contacts so they don’t land in spam.",
      },
    ],
  },
  {
    id: "rules",
    title: "Rights, rules and safe content",
    summary: "What you can and can’t publish.",
    blocks: [
      { kind: "h3", text: "You can publish" },
      {
        kind: "list",
        items: [
          "Material you wrote, photographed, filmed or built yourself.",
          "Material you have written permission to sell, with credit where it’s due.",
          "Short quotes and data from public sources, clearly credited.",
          "Work you drafted with AI help — as long as you’ve checked it and disclosed it.",
        ],
      },
      { kind: "h3", text: "You can’t publish" },
      {
        kind: "list",
        items: [
          "Other people’s books, courses, templates or photos without permission.",
          "Other people’s private information (names, phone numbers, photos of clients).",
          "Anything illegal, hateful, sexually explicit or encouraging dangerous activity.",
          "Guaranteed results, fake credentials or misleading “before and after” claims.",
          "Files with malware, hidden links, or anything other than what the listing describes.",
        ],
      },
      {
        kind: "p",
        text: "Doerly’s review checks quality and fit — it is not a certification that your advice is correct in every situation. You remain responsible for what your product says.",
      },
      { kind: "link", label: "Read the Creator Content Rules", to: "/creator-rules" },
      { kind: "link", label: "Read the Terms of Use", to: "/terms" },
    ],
  },
  {
    id: "account",
    title: "Account, sign-in and security",
    summary: "Passwords, sign-in options and keeping your account safe.",
    blocks: [
      {
        kind: "list",
        items: [
          "Forgot your password? In the sign-in window, press Forgot password?, then open the link we email you to choose a new one.",
          "Signed up with Google or Lovable? Keep using the same button — there’s no separate Doerly password.",
          "Never share your account. Each creator should have their own.",
          "If you think someone else has accessed your account, change your password straight away and email us.",
        ],
      },
      {
        kind: "p",
        text: "Your drafts and uploaded files are private to your account. Doerly staff only open them to review a submission or investigate a report.",
      },
      { kind: "link", label: "Read the Privacy Notice", to: "/privacy" },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    summary: "Quick fixes for the most common problems.",
    blocks: [
      {
        kind: "table",
        columns: ["Problem", "Try this"],
        rows: [
          [
            "My upload stops or fails",
            "Check the file is under 500 MB and one of the accepted types. Use a stable connection and keep the page open. Very large videos are easier to deliver as a ZIP of shorter clips.",
          ],
          [
            "“File type isn’t supported”",
            "Save or export the file as PDF, DOCX, XLSX, MP4 or another accepted type. Rename files that have no extension.",
          ],
          [
            "Thumbnail is rejected",
            "Use PNG, JPG or WebP under 5 MB. Screenshots from phones are often HEIC — convert them first.",
          ],
          [
            "I can’t edit my product",
            "Press Edit first. If it’s in review, press Withdraw to edit. If it’s live, press Edit product to start a new version.",
          ],
          [
            "The dashboard keeps sending me to the Creator page",
            "Your profile setup isn’t finished, or our policies were updated. Complete the remaining step and you’ll be taken back.",
          ],
          [
            "I didn’t get an email",
            "Check spam and promotions, and add doerly@myjoyfullday.site to your contacts. In-app notices on your Overview always show the same news.",
          ],
          [
            "The AI helper didn’t fill anything",
            "Write a longer description (a few sentences) and try again. If it says it’s busy, wait a minute.",
          ],
        ],
      },
    ],
  },
];

export const helpFaqs: HelpFaq[] = [
  {
    question: "How long does review take?",
    answer:
      "Most products are reviewed within 2 working days. Products on risk-sensitive topics (money, animal health, electrical or gas work) need a specialist and can take longer. You get an email the moment your product is approved.",
  },
  {
    question: "Can I edit a product while it’s in review?",
    answer:
      "Not directly. Press Withdraw to edit to move it back to draft, make your changes, then submit again. It goes back into the review queue.",
  },
  {
    question: "Will my live product go offline while I update it?",
    answer:
      "No. Editing a live product creates a new version. The current page stays up until the update is approved.",
  },
  {
    question: "Do I keep the rights to my work?",
    answer:
      "Yes. You keep ownership. You give Doerly permission to host, display and deliver your product to buyers, which ends when you remove it (except for copies people already have).",
  },
  {
    question: "Can I sell the same product on other websites?",
    answer:
      "Yes. Doerly doesn’t ask for exclusivity. Just keep the listing accurate for the version you upload here.",
  },
  {
    question: "Can I use AI to write my product?",
    answer:
      "You can use AI to help, but the know-how must be yours and you must check every fact. Disclose substantial AI help, and never let AI invent experience or results.",
  },
  {
    question: "When can I charge for products?",
    answer:
      "Paid checkout is being prepared. You can already set a price — it’s saved and shown on your page. We’ll email all creators before paid sales open, with the final fees and payout options.",
  },
  {
    question: "How do people find my product?",
    answer:
      "Through search and categories on Doerly, and through links you share yourself. A specific title, a clear overview and good search tags make the biggest difference.",
  },
  {
    question: "Can I delete a product?",
    answer:
      "You can unlist a live product at any time; people who already have it keep access. Drafts you never submitted stay private to you. To remove a product permanently, email support.",
  },
  {
    question: "Can I have more than one creator profile?",
    answer:
      "Each account has one creator profile. If you publish for a business, use the business name as your display name.",
  },
  {
    question: "Who reviews my product?",
    answer:
      "A Doerly admin, using the six quality checks on this page. Risk-sensitive products are also checked by a specialist in that area.",
  },
  {
    question: "What if a buyer says my file is broken?",
    answer:
      "Doerly support will get in touch about the report. Check the file opens on a phone and a computer, upload a fixed version as an update, and reply through the support route. Most issues are fixed with a corrected file.",
  },
];

/** Plain text of a section, used for page search. */
export function sectionSearchText(section: HelpSection) {
  const parts = [section.title, section.summary];
  for (const block of section.blocks) {
    if (block.kind === "p" || block.kind === "h3") parts.push(block.text);
    else if (block.kind === "steps" || block.kind === "list") parts.push(...block.items);
    else if (block.kind === "tip" || block.kind === "warning") parts.push(block.title, block.text);
    else if (block.kind === "table") parts.push(...block.rows.flat());
    else parts.push(block.label);
  }
  return parts.join(" ").toLowerCase();
}

/** Sections and FAQs whose text contains every word of the query. */
export function searchHelp(query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (text: string) => words.every((word) => text.includes(word));
  if (!words.length) return { sections: helpSections, faqs: helpFaqs };
  return {
    sections: helpSections.filter((s) => matches(sectionSearchText(s))),
    faqs: helpFaqs.filter((f) => matches(`${f.question} ${f.answer}`.toLowerCase())),
  };
}
