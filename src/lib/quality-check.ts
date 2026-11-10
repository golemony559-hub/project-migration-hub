/** Browser-safe rules for the automatic quality & originality check. */

export const QUALITY_CRITERIA = [
  { key: "originality", label: "Originality" },
  { key: "completeness", label: "Completeness" },
  { key: "accuracy", label: "Description accuracy" },
  { key: "relevance", label: "Relevance" },
  { key: "readability", label: "Formatting & readability" },
  { key: "evidence", label: "Supporting evidence" },
] as const;

export type QualityKey = (typeof QUALITY_CRITERIA)[number]["key"];
export type QualityScores = Record<QualityKey, number>;
export type QualityOverall = "pass" | "needs_work" | "concern";

export const OVERALL_LABELS: Record<QualityOverall, string> = {
  pass: "Looks ready for review",
  needs_work: "Could be improved",
  concern: "Needs attention",
};

/** Any criterion at 2/5 or lower is a concern; an average under 3.5 needs work; otherwise it passes. */
export function overallFromScores(scores: QualityScores): QualityOverall {
  const values = QUALITY_CRITERIA.map((c) => scores[c.key]);
  if (values.some((v) => v <= 2)) return "concern";
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return avg < 3.5 ? "needs_work" : "pass";
}

const clampScore = (v: unknown) => {
  const n = typeof v === "number" ? Math.round(v) : Number.NaN;
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3;
};

const cleanList = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : [])
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, max);

/** Turns the model's JSON into a safe, complete check result (or null if unusable). */
export function parseQualityCheck(text: string) {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const rawScores = (raw["scores"] ?? {}) as Record<string, unknown>;
  const scores = Object.fromEntries(
    QUALITY_CRITERIA.map((c) => [c.key, clampScore(rawScores[c.key])]),
  ) as QualityScores;
  return {
    scores,
    overall: overallFromScores(scores),
    summary: typeof raw["summary"] === "string" ? raw["summary"].trim().slice(0, 800) : "",
    flags: cleanList(raw["flags"], 6),
    suggestions: cleanList(raw["suggestions"], 6),
  };
}
