import { describe, expect, it } from "vitest";
import { normalizeListingTags, parseListingSuggestion } from "@/lib/listing-assistant";

describe("listing assistant", () => {
  it("normalizes, de-duplicates and caps tags at 8", () => {
    const tags = normalizeListingTags([
      "#Poultry", "poultry", "  Brooder  Setup ", "chicks", "a", "b", "c", "d", "e", "f",
    ]);
    expect(tags).toEqual(["poultry", "brooder setup", "chicks", "a", "b", "c", "d", "e"]);
  });

  it("rejects a reply without a usable description", () => {
    expect(parseListingSuggestion('{"description":"too short","tags":[]}')).toBeNull();
    expect(parseListingSuggestion("not json")).toBeNull();
  });
});
