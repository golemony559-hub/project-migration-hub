// Bump this whenever Terms, Privacy, or Creator Rules text changes so existing
// creators are asked to review the updated drafts again.
export const POLICY_DRAFT_VERSION = "prelaunch-draft-2026-11-10-v2";

// Contact details shown in the policies. Replace with the real operating
// company details before launch.
export const legalContact = {
  operator: "Doerly",
  supportEmail: "support@doerly.app",
  privacyEmail: "privacy@doerly.app",
  copyrightEmail: "copyright@doerly.app",
};

export type PolicySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  closing?: string[];
};

export type PolicyDocument = {
  id: "terms" | "privacy" | "creator-rules";
  title: string;
  lastUpdated: string;
  introduction: string;
  sections: PolicySection[];
};

const { operator, supportEmail, privacyEmail, copyrightEmail } = legalContact;

export const policyDrafts: PolicyDocument[] = [
  {
    id: "terms",
    title: "Terms of Use",
    lastUpdated: "10 November 2026",
    introduction: `These Terms of Use ("Terms") are an agreement between you and ${operator} ("Doerly", "we", "us"). They apply when you visit the Doerly website, create an account, buy or download a resource, or publish a resource as a creator. Please read them carefully. If you do not agree, do not use Doerly.`,
    sections: [
      {
        heading: "What Doerly is",
        paragraphs: [
          "Doerly is an online marketplace for practical know-how. Independent creators — farmers, tradespeople, freelancers, small-business owners and other practitioners — publish digital resources such as ebooks, guides, playbooks, checklists and templates. Buyers search for a problem they are trying to solve and buy or download resources that help.",
          "Doerly provides the marketplace, accounts, file hosting and (once enabled) checkout. Unless a listing clearly says otherwise, each resource is created and offered by its creator, not by Doerly. The creator is responsible for what the resource says.",
        ],
      },
      {
        heading: "Who can use Doerly",
        bullets: [
          "You must be at least 18 years old, or the age of legal majority where you live if that is higher, to create an account, buy resources or sell as a creator.",
          "You must be able to enter into a binding contract and must not be barred from using the service under the laws that apply to you.",
          "If you use Doerly on behalf of a business, farm, cooperative or other organisation, you confirm you are authorised to accept these Terms for it, and \"you\" includes that organisation.",
        ],
      },
      {
        heading: "Your account",
        paragraphs: [
          "You can sign up with an email address and password, or with Google or Lovable sign-in. You agree to:",
        ],
        bullets: [
          "give accurate information and keep it up to date;",
          "keep your password private and not share your account with anyone;",
          "tell us promptly at " + supportEmail + " if you think someone has accessed your account without permission;",
          "take responsibility for activity that happens under your account, unless it was caused by our failure to keep the service secure.",
        ],
        closing: [
          "We may ask you to verify your email address or identity before you can buy, publish or receive payouts.",
        ],
      },
      {
        heading: "Buying resources",
        paragraphs: [
          "Each listing shows the title, problem it addresses, format, description, creator and price. Read the listing before you buy. Prices are shown in the listed currency and may not include taxes, which will be shown at checkout where they apply.",
          "Payments will be processed by a third-party payment provider. Doerly does not store your full card number. When you complete a purchase you enter into a contract to buy access to that resource, and you authorise the charge shown at checkout.",
          "After payment is confirmed, the resource becomes available in your account for download. Free resources may require you to sign in before downloading.",
        ],
        closing: [
          "Paid checkout is not active yet. Until it is, no payment is taken and prices shown are for information only.",
        ],
      },
      {
        heading: "What you may do with a resource you buy",
        paragraphs: [
          "When you buy or download a resource, the creator grants you a personal, non-exclusive, non-transferable licence to use it for your own work, farm or household. Unless the listing grants a wider licence (for example, a team or organisation licence), you may not:",
        ],
        bullets: [
          "resell, rent, share, publicly post or give the file to others;",
          "copy substantial parts of it into your own product, course or publication;",
          "remove the creator's name, copyright notices or watermarks;",
          "use the resource, or content scraped from Doerly, to train or fine-tune machine-learning or AI models;",
          "claim the work as your own.",
        ],
        closing: [
          "You may print a copy and keep backup copies for your own use. The creator keeps all ownership of the resource.",
        ],
      },
      {
        heading: "Refunds and problems with a purchase",
        paragraphs: [
          "Because resources are digital and delivered immediately, purchases are generally final once downloaded. We will, however, offer a refund or a replacement file if you contact us within 14 days of purchase and:",
        ],
        bullets: [
          "the file is broken, empty or cannot be opened and the creator cannot fix it within a reasonable time;",
          "the resource is materially different from its listing (for example, the wrong topic, much shorter than described, or missing promised sections);",
          "you were charged more than once for the same resource, or charged without authorising the payment.",
        ],
        closing: [
          `To request help, email ${supportEmail} with your order details and a short description of the problem. Nothing in these Terms limits any rights you have under consumer protection laws that apply to you and cannot be excluded.`,
        ],
      },
      {
        heading: "Selling as a creator",
        paragraphs: [
          "Any account holder can set up a creator profile and publish resources, subject to these Terms and the Creator Content Rules. By publishing a resource you confirm that:",
        ],
        bullets: [
          "you created the resource, or you have all the rights and permissions needed to sell it;",
          "the listing accurately describes the content, format, intended audience and limitations;",
          "the resource does not infringe anyone's rights, break any law, or expose another person's private information;",
          "statements about your experience and results are honest and not misleading.",
        ],
        closing: [
          "You keep ownership of your resources. You grant Doerly a worldwide, non-exclusive, royalty-free licence to host, store, copy, display, promote and deliver your listing and files to buyers, and to make reasonable technical changes (such as previews, thumbnails or format conversions) needed to run the marketplace. This licence ends when you remove the resource, except for copies buyers have already purchased and copies kept in backups or for legal records.",
        ],
      },
      {
        heading: "Creator earnings, fees and taxes",
        paragraphs: [
          "When paid sales are enabled, Doerly will collect payment from the buyer and pay the creator their share after deducting the platform fee and payment-processing costs shown in the creator studio at the time of the sale. We will tell you about any change to fees at least 30 days before it applies to new sales.",
          "Payouts will be made through a payment provider to an account in your name once you complete its identity checks. We may hold payouts for a reasonable period to cover refunds, chargebacks or suspected fraud, and may deduct refunded or charged-back amounts from future earnings.",
          "You are responsible for reporting and paying any income tax, VAT or other taxes on your earnings, except where the law requires Doerly to collect or withhold them.",
        ],
        closing: [
          "Creator payouts are not active yet. No earnings are recorded until checkout is switched on.",
        ],
      },
      {
        heading: "Rules for everyone",
        paragraphs: ["When using Doerly you must not:"],
        bullets: [
          "upload malware, or try to access accounts, files or systems you are not authorised to use;",
          "scrape, copy or bulk-download listings or files, or interfere with the normal running of the service;",
          "post content that is illegal, hateful, harassing, sexually explicit, or that promotes violence or dangerous activities;",
          "mislead buyers, manipulate reviews or search results, or create fake accounts;",
          "use Doerly to send spam or to arrange sales outside the platform to avoid fees;",
          "break any law, including consumer, copyright, data-protection, export or sanctions laws.",
        ],
      },
      {
        heading: "Practical information, not professional advice",
        paragraphs: [
          "Resources share practical experience. They are not a substitute for advice from a qualified professional such as a veterinarian, doctor, lawyer, accountant, engineer or licensed electrician. Conditions vary by location, climate, breed, equipment and regulation, so results are not guaranteed.",
          "Use your own judgement, follow local laws and safety rules, and get professional help for decisions involving animal or human health, money, legal obligations or safety. Doerly does not check every statement in every resource, and a listing appearing on Doerly is not an endorsement.",
        ],
      },
      {
        heading: "Copyright and content complaints",
        paragraphs: [
          `If you believe a resource on Doerly infringes your copyright or other rights, email ${copyrightEmail} with: your contact details; a description of the work you own; a link to the listing; a statement that you believe in good faith the use is not authorised; and a statement that the information in your notice is accurate and that you are the owner or authorised to act for them.`,
          "We will review valid notices, may remove or disable the listing, and will tell the creator, who may respond with a counter-notice. We close the accounts of repeat infringers where appropriate.",
        ],
      },
      {
        heading: "Review, removal and account suspension",
        paragraphs: [
          "We may review listings before or after publication. We may decline, unpublish or remove a resource, limit features, or suspend or close an account if we reasonably believe it breaks these Terms or the Creator Content Rules, creates risk for buyers or Doerly, or if the law requires it. Where practical, we will tell you why and give you a chance to respond.",
          "You can close your account at any time from your account settings or by emailing us. Buyers keep access to resources they have already paid for unless they were removed for legal reasons. Sections of these Terms that by their nature should continue (such as licences already granted, payment obligations, disclaimers and limits on liability) continue after your account closes.",
        ],
      },
      {
        heading: "Third-party services",
        paragraphs: [
          "Doerly relies on third parties for hosting, sign-in (such as Google), file storage, email and payments. Your use of those services may be subject to their own terms. We are not responsible for third-party websites or services linked from a resource or listing.",
        ],
      },
      {
        heading: "Disclaimers",
        paragraphs: [
          "We work hard to keep Doerly available and secure, but the service is provided \"as is\" and \"as available\". To the extent the law allows, we do not promise that the service will be uninterrupted or error-free, or that any resource will be accurate, complete or suitable for your purpose.",
        ],
      },
      {
        heading: "Limits on our liability",
        paragraphs: [
          "To the extent the law allows, Doerly is not liable for indirect or consequential losses, including lost profits, lost crops or livestock, lost data, or business interruption, arising from your use of Doerly or any resource. Our total liability to you for any claim relating to the service is limited to the greater of the amount you paid Doerly in the 12 months before the claim, or USD 100.",
          "Nothing in these Terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot be limited by law.",
        ],
      },
      {
        heading: "Your responsibility to us",
        paragraphs: [
          "If you are a creator, you agree to cover reasonable losses and costs (including legal fees) that Doerly incurs because of a claim that your resource or listing infringes someone's rights, breaks the law, or breaks these Terms.",
        ],
      },
      {
        heading: "Changes to Doerly and to these Terms",
        paragraphs: [
          "We may change, add or remove features as the marketplace develops. We may update these Terms from time to time. If a change is significant, we will notify you by email or in the app at least 14 days before it takes effect. Continuing to use Doerly after the change means you accept the updated Terms; if you do not agree, you can close your account.",
        ],
      },
      {
        heading: "Governing law and disputes",
        paragraphs: [
          `If you have a problem, please contact us first at ${supportEmail} — most issues can be resolved quickly. These Terms are governed by the laws of the country where Doerly's operating company is registered, which will be named here before launch. If you are a consumer, you also keep the protection of the mandatory laws of the country where you live and may bring proceedings in your local courts.`,
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          `Questions about these Terms: ${supportEmail}. Copyright notices: ${copyrightEmail}. Privacy questions: ${privacyEmail}.`,
        ],
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy Notice",
    lastUpdated: "10 November 2026",
    introduction: `This Privacy Notice explains what personal information ${operator} collects when you use Doerly, why we use it, who we share it with, and the choices and rights you have. It applies to the Doerly website and related services. If something is unclear, email ${privacyEmail}.`,
    sections: [
      {
        heading: "Who is responsible for your information",
        paragraphs: [
          `${operator} is responsible (the "controller") for the personal information described in this notice. When you buy a resource, the creator who made it may receive limited purchase information (see "Who we share information with") and is separately responsible for how they use it.`,
        ],
      },
      {
        heading: "Information you give us",
        bullets: [
          "Account details: your name, email address and password. Passwords are stored in hashed form; we cannot see them.",
          "Creator profile: display name, profile photo link, short biography, areas of expertise, practical experience and the date you reviewed our policies. Your creator profile is public.",
          "Resources and listings: titles, descriptions, categories, prices, and the files you upload. Draft listings and files are private to you until you publish.",
          "Messages: what you send us when you contact support, report a problem or make a copyright complaint.",
          "Payment and payout details (once checkout is enabled): these are collected and stored by our payment provider. We receive confirmation of payments, the last digits of the card, and payout status — not full card or bank numbers.",
        ],
      },
      {
        heading: "Information collected automatically",
        bullets: [
          "Sign-in session: when you sign in, a session token is saved in your browser's local storage so you stay signed in. It is removed when you sign out.",
          "Usage and device information: pages viewed, searches, the date and time of requests, IP address, browser type, device type and approximate location derived from your IP address. This comes from server and hosting logs.",
          "Error reports: technical details when something goes wrong, so we can fix it.",
        ],
        closing: [
          "Doerly does not use advertising cookies or sell data to advertisers. Our web fonts are loaded from Google Fonts, which means your browser sends your IP address to Google when the page loads.",
        ],
      },
      {
        heading: "Information from other services",
        paragraphs: [
          "If you choose Google or Lovable sign-in, that service shares your name, email address and, if available, profile picture with us. We do not receive your password for those services. You can manage what they share in your Google or Lovable account settings.",
        ],
      },
      {
        heading: "How we use your information",
        bullets: [
          "To create and run your account, keep you signed in and verify your email. (Needed to provide the service you asked for.)",
          "To publish creator profiles and listings, deliver files to buyers, and show search results. (Needed to provide the service.)",
          "To process purchases, refunds and creator payouts once checkout is enabled. (Needed to provide the service, and to meet legal and tax obligations.)",
          "To send service emails such as sign-up confirmation, password resets, purchase receipts and important changes to our terms. (Needed to provide the service.)",
          "To keep Doerly safe: detect fraud, spam and abuse, enforce our Terms, and handle copyright complaints. (Our legitimate interest in protecting users and the platform.)",
          "To understand how Doerly is used and improve search, listings and features. (Our legitimate interest; we use aggregated or de-identified data where possible.)",
          "To send occasional product news, only if you opt in. You can unsubscribe at any time. (Your consent.)",
          "To comply with the law, respond to lawful requests, and establish or defend legal claims. (Legal obligation and legitimate interest.)",
        ],
      },
      {
        heading: "What is public on Doerly",
        paragraphs: [
          "Published listings, creator display names, profile photos, biographies, expertise and practical experience are visible to anyone, including people who are not signed in, and may be indexed by search engines. Your email address is never shown publicly. Please do not include private or sensitive information in a public profile or listing.",
        ],
      },
      {
        heading: "Who we share information with",
        bullets: [
          "Service providers who host Doerly and provide our database, sign-in, file storage, email delivery, error monitoring and (once enabled) payments. They may only use the information to provide services to us.",
          "Creators, when you buy their resource: the creator can see that a purchase was made and your display name. We do not share your email address with creators unless you choose to contact them.",
          "Authorities or other parties when the law requires it, or when needed to protect someone's safety, prevent fraud, or enforce our Terms.",
          "A buyer or successor if Doerly is involved in a merger, acquisition or sale of assets. We will tell you before your information becomes subject to a different privacy notice.",
        ],
        closing: ["We do not sell your personal information, and we do not share it for targeted advertising."],
      },
      {
        heading: "International transfers",
        paragraphs: [
          "Our service providers may store and process information in countries other than the one where you live, including the United States and the European Union. When we transfer personal information internationally we use appropriate safeguards, such as standard contractual clauses, where the law requires them.",
        ],
      },
      {
        heading: "How long we keep information",
        bullets: [
          "Account and profile information: for as long as your account is open. When you close your account we delete or anonymise it within 30 days, except as described below.",
          "Published resources: until you remove them or close your account. Copies already delivered to buyers remain with those buyers.",
          "Purchase, payout and tax records: for as long as tax and accounting laws require, typically up to 7 years.",
          "Server logs and error reports: usually up to 90 days, unless needed longer to investigate a security issue.",
          "Backups: deleted information may remain in encrypted backups for up to 35 days before it is overwritten.",
        ],
      },
      {
        heading: "How we protect information",
        paragraphs: [
          "Connections to Doerly are encrypted with HTTPS. Access to accounts and private files is restricted by database and storage permissions, so creators' draft files can only be read by the creator who uploaded them. Passwords are hashed. Staff access to personal information is limited to people who need it. No system is perfectly secure; if we become aware of a breach affecting your information, we will notify you and the authorities as the law requires.",
        ],
      },
      {
        heading: "Your choices and rights",
        paragraphs: [
          "Depending on where you live, you may have the right to:",
        ],
        bullets: [
          "access the personal information we hold about you and get a copy;",
          "correct information that is inaccurate or incomplete — most profile details can be edited directly in the creator studio;",
          "delete your account and personal information;",
          "receive your information in a portable format;",
          "object to or restrict certain uses, such as use based on our legitimate interests;",
          "withdraw consent at any time where we rely on consent, such as marketing emails;",
          "complain to your local data-protection authority.",
        ],
        closing: [
          `To make a request, email ${privacyEmail} from the address linked to your account. We may need to verify your identity, and we will respond within 30 days. We will not treat you differently for exercising your rights.`,
        ],
      },
      {
        heading: "Children",
        paragraphs: [
          "Doerly is not intended for anyone under 18, and we do not knowingly collect information from children. If you believe a child has created an account, contact us and we will delete it.",
        ],
      },
      {
        heading: "Changes to this notice",
        paragraphs: [
          "We will update this notice when our practices change. The date at the top shows when it was last updated. If the changes are significant, we will tell you by email or in the app before they take effect.",
        ],
      },
      {
        heading: "Contact us",
        paragraphs: [
          `For privacy questions or requests, email ${privacyEmail}. For anything else, email ${supportEmail}.`,
        ],
      },
    ],
  },
  {
    id: "creator-rules",
    title: "Creator Content Rules",
    lastUpdated: "10 November 2026",
    introduction:
      "These rules set the quality and responsibility bar for creator resources. The admin review process, appeals, restricted categories, and support channel are not yet configured.",
    sections: [
      {
        heading: "Rights and originality",
        bullets: [
          "Submit only material you created or have permission to distribute.",
          "Identify third-party material, sources, and material AI assistance when it affects what buyers should expect.",
          "Do not upload material that infringes rights, exposes another person's private information, or is unlawful.",
        ],
      },
      {
        heading: "Describe the resource accurately",
        bullets: [
          "Name the practical problem and intended audience.",
          "Describe the contents, format, prerequisites, limitations, and expected way to use the resource.",
          "Keep the listing, preview, file, and price consistent. Do not promise guaranteed outcomes or credentials that have not been independently verified.",
        ],
      },
      {
        heading: "Accuracy and safe use",
        paragraphs: [
          "Creators remain responsible for their material. Consequential claims should include suitable sources, dates, context, and cautions. Veterinary, health, legal, financial, and safety-critical topics need specific safeguards or specialist review; those final category rules are still open.",
        ],
      },
      {
        heading: "Buyer support",
        paragraphs: [
          "Creators are expected to respond to relevant reports about access failure, a broken or wrong file, or a material mismatch between the resource and its listing. The support route and final remedies must be established before paid sales begin.",
        ],
      },
      {
        heading: "Review is not certification",
        paragraphs: [
          "A human review should check problem fit, completeness, listing-to-file fidelity, usability, creator claims, rights, and relevant safety concerns. A review decision is not proof that advice is universally correct or effective.",
        ],
      },
    ],
  },
];
