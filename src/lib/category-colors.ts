/** Each industry/category gets its own text colour for tags and labels. */
const KNOWN: Record<string, number> = {
  Business: 1,
  "Farming & food": 2,
  "Home & repair": 3,
  Marketing: 4,
  Money: 5,
  Technology: 6,
};
export const TONE_COUNT = 8;

export function categoryTone(category: string | null | undefined): number {
  if (!category) return 0;
  const known = KNOWN[category.trim()];
  if (known) return known;
  let h = 0;
  for (const ch of category.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % TONE_COUNT) + 1;
}

/** Class that sets the category's text colour (`cat-tone-N`), or "" for no category. */
export function categoryToneClass(category: string | null | undefined): string {
  const t = categoryTone(category);
  return t ? `cat-tone cat-tone-${t}` : "";
}
