/** Shared, browser-safe rules for the AI helper that fills in a product listing. */
import { normalizeListingTags } from "./listing-assistant";

export const AUTOFILL_NOTES_MIN_CHARS = 30;
export const AUTOFILL_NOTES_MAX_CHARS = 20000;

export const AUTOFILL_LIMITS = {
  title: 120,
  summary: 300,
  description: 5000,
  outcomes: 2000,
  sourcesNote: 1000,
} as const;

export type ProductAutofillFields = {
  title: string;
  summary: string;
  description: string;
  outcomes: string;
  sourcesNote: string;
  tags: string[];
  /** Null when the model picked something outside the allowed list. */
  category: string | null;
  format: string | null;
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\r\n/g, "\n").trim().slice(0, max) : "";

/**
 * Parses the model's JSON reply into safe form values. Category and type must come
 * from the allowed lists; anything else becomes null so the creator's choice stays.
 */
export function parseProductAutofill(
  text: string,
  allowed: { categories: readonly string[]; formats: readonly string[] },
): ProductAutofillFields | null {
  let parsed: Partial<Record<"title" | "summary" | "description" | "outcomes" | "category" | "format" | "sources_note" | "tags", unknown>>;
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const title = clean(parsed.title, AUTOFILL_LIMITS.title);
  const description = clean(parsed.description, AUTOFILL_LIMITS.description);
  if (title.length < 5 || description.length < 20) return null;
  const category = typeof parsed.category === "string" ? parsed.category.trim() : "";
  const format = typeof parsed.format === "string" ? parsed.format.trim() : "";
  return {
    title,
    summary: clean(parsed.summary, AUTOFILL_LIMITS.summary),
    description,
    outcomes: clean(parsed.outcomes, AUTOFILL_LIMITS.outcomes),
    sourcesNote: clean(parsed.sources_note, AUTOFILL_LIMITS.sourcesNote),
    tags: normalizeListingTags(parsed.tags),
    category: allowed.categories.includes(category) ? category : null,
    format: allowed.formats.includes(format) ? format : null,
  };
}
