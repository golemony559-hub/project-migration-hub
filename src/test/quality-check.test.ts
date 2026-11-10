import { describe, expect, it } from "vitest";
import { overallFromScores, parseQualityCheck } from "@/lib/quality-check";

const all = (n: number) => ({ originality: n, completeness: n, accuracy: n, relevance: n, readability: n, evidence: n });

describe("automatic quality check result", () => {
  it("any criterion at 2 or lower needs attention", () => {
    expect(overallFromScores({ ...all(5), originality: 2 })).toBe("concern");
  });
  it("an average under 3.5 could be improved", () => {
    expect(overallFromScores(all(3))).toBe("needs_work");
  });
  it("strong scores look ready for review", () => {
    expect(overallFromScores(all(4))).toBe("pass");
  });
  it("clamps odd scores and drops unusable output", () => {
    const r = parseQualityCheck(JSON.stringify({ scores: { ...all(4), evidence: 9 }, summary: "Ok", flags: ["x"], suggestions: [] }));
    expect(r?.scores.evidence).toBe(5);
    expect(parseQualityCheck("not json")).toBeNull();
  });
});
