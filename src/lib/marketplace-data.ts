import type { Tables } from "@/integrations/supabase/types";

export type GuideListing = Pick<
  Tables<"guides">,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "description"
  | "category"
  | "format"
  | "reading_time_minutes"
  | "price_cents"
  | "currency_code"
  | "creator_id"
  | "created_at"
> & {
  creator_name: string;
  creator_bio?: string;
  creator_avatar_url?: string | null;
  tags?: string[];
  thumbnail_path?: string | null;
  outcomes?: string;
  coffee_url?: string;
  sample?: boolean;
};

const searchStopWords = new Set([
  "a",
  "about",
  "am",
  "an",
  "and",
  "are",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "would",
  "you",
  "your",
]);

function expandSearchToken(token: string) {
  const variants = new Set([token]);

  if (token.length > 4 && token.endsWith("ies")) {
    variants.add(`${token.slice(0, -3)}y`);
  } else if (token.length > 5 && token.endsWith("ing")) {
    const stem = token.slice(0, -3);
    variants.add(stem);
    variants.add(`${stem}e`);
  } else if (token.length > 4 && token.endsWith("ed")) {
    const stem = token.slice(0, -2);
    variants.add(stem);
    variants.add(`${stem}e`);
  } else if (token.length > 4 && token.endsWith("es")) {
    variants.add(token.slice(0, -2));
    variants.add(token.slice(0, -1));
  } else if (token.length > 3 && token.endsWith("s")) {
    variants.add(token.slice(0, -1));
  }

  return variants;
}

function getSearchTokens(value: string) {
  return (
    value
      .normalize("NFKD")
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

export function rankGuideListings(listings: GuideListing[], query: string) {
  const queryTokens = [
    ...new Set(
      getSearchTokens(query).filter((token) => token.length > 2 && !searchStopWords.has(token)),
    ),
  ];
  if (!queryTokens.length) return listings;

  const minimumMatches = Math.max(1, Math.ceil(queryTokens.length * 0.4));
  const fieldsForGuide = (guide: GuideListing) => [
    { value: guide.title, weight: 5 },
    { value: guide.summary, weight: 4 },
    { value: guide.description, weight: 2 },
    { value: guide.category, weight: 2 },
    { value: guide.format, weight: 1 },
    { value: guide.creator_name, weight: 1 },
    { value: guide.creator_bio ?? "", weight: 2 },
  ];

  return listings
    .map((guide, index) => {
      const fields = fieldsForGuide(guide).map(({ value, weight }) => ({
        terms: new Set(getSearchTokens(value).flatMap((token) => [...expandSearchToken(token)])),
        weight,
      }));
      let matchedTerms = 0;
      let score = 0;

      for (const queryToken of queryTokens) {
        const variants = expandSearchToken(queryToken);
        const matchingWeight = Math.max(
          0,
          ...fields
            .filter((field) => [...variants].some((variant) => field.terms.has(variant)))
            .map((field) => field.weight),
        );
        if (matchingWeight > 0) {
          matchedTerms += 1;
          score += matchingWeight;
        }
      }

      return { guide, index, matchedTerms, score };
    })
    .filter(({ matchedTerms }) => matchedTerms >= minimumMatches)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ guide }) => guide);
}

export const sampleGuides: GuideListing[] = [
  {
    id: "sample-poultry",
    slug: "healthy-chicks-first-eight-weeks",
    title: "Healthy chicks: your first eight weeks",
    summary:
      "A practical, day-by-day guide to raising strong chicks from hatch to healthy pullets.",
    description:
      "A field-tested example guide for new poultry keepers, covering brooder setup, daily checks, feeding, clean water and the early warning signs worth acting on. It is one example of the kind of know-how shared here.",
    category: "Farming & food",
    format: "Guide",
    reading_time_minutes: 18,
    price_cents: 0,
    currency_code: "USD",
    creator_id: "sample-creator-poultry",
    creator_name: "Miriam K.",
    created_at: "2026-10-22T00:00:00.000Z",
    sample: true,
  },
  {
    id: "sample-business",
    slug: "first-freelance-client-playbook",
    title: "The first freelance client playbook",
    summary:
      "A clear process for scoping work, agreeing expectations and starting with confidence.",
    description:
      "A practical sample playbook for independent professionals: discovery questions, a simple scope, project kickoff, and the small communication habits that keep client work moving.",
    category: "Business",
    format: "Playbook",
    reading_time_minutes: 24,
    price_cents: 0,
    currency_code: "USD",
    creator_id: "sample-creator-business",
    creator_name: "Sam O.",
    created_at: "2026-10-18T00:00:00.000Z",
    sample: true,
  },
  {
    id: "sample-home",
    slug: "fix-a-dripping-tap",
    title: "Fix a dripping tap without the guesswork",
    summary: "Identify the common cause, gather the right tools and make a careful first repair.",
    description:
      "An example home-repair guide that walks through basic checks, common tap types, a safe shutoff, and when to stop and call a qualified plumber.",
    category: "Home & repair",
    format: "Guide",
    reading_time_minutes: 12,
    price_cents: 0,
    currency_code: "USD",
    creator_id: "sample-creator-home",
    creator_name: "Nia R.",
    created_at: "2026-10-14T00:00:00.000Z",
    sample: true,
  },
  {
    id: "sample-money",
    slug: "a-simple-monthly-money-plan",
    title: "A simpler monthly money plan",
    summary: "A gentle, repeatable way to map spending, savings and the month ahead.",
    description:
      "An example personal-finance worksheet and guide for mapping income and planned costs. It is general education, not investment or tax advice.",
    category: "Money",
    format: "Template",
    reading_time_minutes: 15,
    price_cents: 0,
    currency_code: "USD",
    creator_id: "sample-creator-money",
    creator_name: "Jordan P.",
    created_at: "2026-10-11T00:00:00.000Z",
    sample: true,
  },
  {
    id: "sample-technology",
    slug: "first-saas-product-design-system",
    title: "A design system for your first product",
    summary: "Bring consistency to a small software product with a practical starter system.",
    description:
      "An example technology guide covering the first useful design tokens, reusable interface patterns, accessibility checks, and a lightweight way to keep a growing product consistent.",
    category: "Technology",
    format: "Ebook",
    reading_time_minutes: 32,
    price_cents: 0,
    currency_code: "USD",
    creator_id: "sample-creator-technology",
    creator_name: "Alex D.",
    created_at: "2026-10-08T00:00:00.000Z",
    sample: true,
  },
  {
    id: "sample-marketing",
    slug: "small-business-first-email-list",
    title: "Build your first email list, one step at a time",
    summary: "A grounded starter plan for finding the right readers and sending useful emails.",
    description:
      "An example marketing playbook for a small business: define who the list serves, create an honest sign-up offer, write a welcome note and plan a sustainable sending rhythm.",
    category: "Marketing",
    format: "Playbook",
    reading_time_minutes: 20,
    price_cents: 0,
    currency_code: "USD",
    creator_id: "sample-creator-marketing",
    creator_name: "Rae T.",
    created_at: "2026-10-04T00:00:00.000Z",
    sample: true,
  },
];

export const marketplaceCategories = [
  "All knowledge",
  "Business",
  "Farming & food",
  "Home & repair",
  "Marketing",
  "Money",
  "Technology",
];

export const marketplaceFormats = [
  "Guide",
  "Ebook",
  "Playbook",
  "Checklist",
  "Template",
  "Toolkit",
  "Spreadsheet / calculator",
  "Video",
  "Audio",
  "Image pack",
  "Course",
];

export type CreatorProfileDetails = {
  expertise: string[];
  experience: string;
  about: string;
};

export function serializeCreatorProfile(details: CreatorProfileDetails) {
  return [
    `Expertise: ${details.expertise.join(", ")}`,
    `Practical experience: ${details.experience.trim()}`,
    `About: ${details.about.trim()}`,
  ].join("\n");
}

export function parseCreatorProfile(bio: string): CreatorProfileDetails {
  const expertise =
    bio
      .match(/^Expertise:\s*(.*)$/m)?.[1]
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  const experience = bio.match(/^Practical experience:\s*(.*)$/m)?.[1]?.trim() ?? "";
  const about =
    bio.match(/^About:\s*([\s\S]*)$/m)?.[1]?.trim() ??
    (bio.startsWith("Expertise:") ? "" : bio.trim());
  return { expertise, experience, about };
}

export function formatGuidePrice(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currencyCode}`;
  }
}

export function slugifyGuideTitle(title: string) {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
