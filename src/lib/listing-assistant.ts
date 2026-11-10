/** Shared, browser-safe rules for AI-suggested listing copy. */
export const LISTING_DRAFT_MIN_CHARS = 80;
export const LISTING_DRAFT_MAX_CHARS = 30000;
export const LISTING_MAX_TAGS = 8;
export const LISTING_TAG_MAX_CHARS = 32;

export type ListingSuggestion = { description: string; tags: string[] };

/** Lower-cases, trims, de-duplicates and caps suggested tags. */
export function normalizeListingTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  for (const raw of tags) {
    if (typeof raw !== "string") continue;
    const tag = raw
      .toLocaleLowerCase()
      .replace(/^#+/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!tag || tag.length > LISTING_TAG_MAX_CHARS) continue;
    seen.add(tag);
    if (seen.size >= LISTING_MAX_TAGS) break;
  }
  return [...seen];
}

/** Parses the model's JSON reply into a safe suggestion, or null when unusable. */
export function parseListingSuggestion(text: string): ListingSuggestion | null {
  try {
    const parsed = JSON.parse(text) as { description?: unknown; tags?: unknown };
    const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    if (description.length < 40) return null;
    return { description, tags: normalizeListingTags(parsed.tags) };
  } catch {
    return null;
  }
}
