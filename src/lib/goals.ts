/** Goal-based discovery: people pick what they want to accomplish, Doerly recommends resources. */
import { rankGuideListings, type GuideListing } from "./marketplace-data";

export type Goal = {
  id: string;
  label: string;
  /** Words and phrases that describe resources useful for this goal. */
  keywords: string[];
  /** Phrases that, typed into search, mean the visitor has this goal. */
  triggers: string[];
  categories: string[];
};

export const GOALS: Goal[] = [
  {
    id: "start-poultry-farm",
    label: "Start a poultry farm",
    keywords: ["poultry", "chicken", "chicks", "broiler", "layers", "eggs", "brooder", "coop", "flock", "feed"],
    triggers: ["poultry farm", "chicken farm", "raise chickens", "raising chickens", "poultry business", "start poultry"],
    categories: ["Farming & food"],
  },
  {
    id: "learn-bookkeeping",
    label: "Learn bookkeeping",
    keywords: ["bookkeeping", "accounts", "accounting", "ledger", "records", "invoices", "receipts", "cash", "expenses", "tax"],
    triggers: ["bookkeeping", "keep books", "accounting basics", "track expenses"],
    categories: ["Money", "Business"],
  },
  {
    id: "start-clothing-business",
    label: "Start a clothing business",
    keywords: ["clothing", "fashion", "apparel", "tailoring", "sewing", "boutique", "garments", "textiles", "retail", "brand"],
    triggers: ["clothing business", "fashion business", "clothing brand", "start a boutique", "sell clothes"],
    categories: ["Business", "Marketing"],
  },
  {
    id: "improve-vegetable-yields",
    label: "Improve vegetable yields",
    keywords: ["vegetable", "vegetables", "crop", "crops", "yield", "soil", "compost", "irrigation", "seeds", "garden", "harvest"],
    triggers: ["vegetable yield", "better harvest", "grow vegetables", "crop yield", "improve yields"],
    categories: ["Farming & food"],
  },
  {
    id: "learn-furniture-making",
    label: "Learn furniture making",
    keywords: ["furniture", "woodwork", "woodworking", "carpentry", "joinery", "timber", "wood", "tools", "workshop"],
    triggers: ["furniture making", "make furniture", "woodworking", "carpentry"],
    categories: ["Home & repair"],
  },
  {
    id: "plan-budget",
    label: "Plan my monthly budget",
    keywords: ["budget", "budgeting", "savings", "saving", "money", "expenses", "income", "debt"],
    triggers: ["monthly budget", "plan my budget", "save money", "budget plan"],
    categories: ["Money"],
  },
];

export function findGoal(id: string | undefined | null) {
  return GOALS.find((g) => g.id === id) ?? null;
}

/** The goal a typed search clearly expresses ("how do I start a poultry farm?"), if any. */
export function matchGoal(query: string): Goal | null {
  const q = ` ${query.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
  if (q.trim().length < 3) return null;
  return (
    GOALS.find(
      (g) =>
        q.includes(` ${g.label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `) ||
        g.triggers.some((t) => q.includes(` ${t} `)),
    ) ?? null
  );
}

/** Resources ranked by how many of the goal's keywords they cover, with a boost for the goal's industries. */
export function rankForGoal(listings: GuideListing[], goal: Goal): GuideListing[] {
  return listings
    .map((guide, index) => {
      const hits = goal.keywords.filter((kw) => rankGuideListings([guide], kw).length > 0).length;
      const score = hits * 2 + (hits > 0 && goal.categories.includes(guide.category) ? 3 : 0);
      return { guide, index, hits, score };
    })
    .filter((r) => r.hits > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.guide);
}

/** How recommendations are grouped on the goal page, in the order a learner would use them. */
export const GOAL_GROUPS: { label: string; formats: string[] }[] = [
  { label: "Start with a guide", formats: ["Guide", "Ebook"] },
  { label: "Step-by-step playbooks", formats: ["Playbook"] },
  { label: "Templates & checklists", formats: ["Template", "Checklist"] },
  { label: "Toolkits & calculators", formats: ["Toolkit", "Spreadsheet / calculator"] },
];

export function groupForGoal(listings: GuideListing[]) {
  const known = new Set(GOAL_GROUPS.flatMap((g) => g.formats));
  const groups = GOAL_GROUPS.map((g) => ({
    label: g.label,
    items: listings.filter((l) => g.formats.includes(l.format)),
  }));
  const other = listings.filter((l) => !known.has(l.format));
  if (other.length) groups.push({ label: "More resources", items: other });
  return groups.filter((g) => g.items.length > 0);
}
