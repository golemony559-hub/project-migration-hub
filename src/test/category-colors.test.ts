import { describe, expect, it } from "vitest";
import { categoryTone, categoryToneClass } from "@/lib/category-colors";

describe("industry colours", () => {
  it("gives each built-in industry its own colour", () => {
    const tones = ["Business", "Farming & food", "Home & repair", "Marketing", "Money", "Technology"].map(categoryTone);
    expect(new Set(tones).size).toBe(6);
  });
  it("always gives the same industry the same colour", () => {
    expect(categoryTone("Construction")).toBe(categoryTone("Construction"));
    expect(categoryToneClass("Money")).toBe("cat-tone cat-tone-5");
  });
});
