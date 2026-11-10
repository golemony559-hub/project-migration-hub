import { describe, expect, it } from "vitest";
import {
  parseCreatorProfile,
  rankGuideListings,
  sampleGuides,
  serializeCreatorProfile,
} from "@/lib/marketplace-data";

describe("creator profile persistence", () => {
  it("round-trips expertise, experience, and public bio through the profile bio field", () => {
    const details = {
      expertise: ["Farming & food", "Business"],
      experience: "Eight years raising poultry.",
      about: "I help new keepers manage healthy flocks.",
    };

    expect(parseCreatorProfile(serializeCreatorProfile(details))).toEqual(details);
  });

  it("keeps older plain-text bios visible as the about section", () => {
    expect(parseCreatorProfile("A longtime poultry keeper.")).toEqual({
      expertise: [],
      experience: "",
      about: "A longtime poultry keeper.",
    });
  });
});

describe("problem-led resource search", () => {
  it("finds matching resources from a natural-language question", () => {
    expect(rankGuideListings(sampleGuides, "How can I raise healthy chicks?")[0]?.slug).toBe(
      "healthy-chicks-first-eight-weeks",
    );
  });

  it("includes a creator's public expertise and experience in search", () => {
    const guide = {
      ...sampleGuides[0]!,
      creator_bio: "Expertise: Farming & food\nPractical experience: Eight years raising poultry.",
    };

    expect(rankGuideListings([guide], "poultry experience")).toEqual([guide]);
  });
});

describe("keyword search across listing details", () => {
  const base = { ...sampleGuides[0]!, title: "Starter notes", summary: "Short notes.", description: "", creator_bio: "" };

  it("finds a resource by one of its tags", () => {
    const guide = { ...base, tags: ["broilers", "vaccination"] };
    expect(rankGuideListings([guide], "vaccination")).toEqual([guide]);
  });

  it("finds a resource from the start of a word", () => {
    const guide = { ...base, title: "Poultry starter notes" };
    expect(rankGuideListings([guide], "poul")).toEqual([guide]);
  });

  it("finds a resource by what it helps you achieve", () => {
    const guide = { ...base, outcomes: "Build a monthly budget you can stick to." };
    expect(rankGuideListings([guide], "budget")).toEqual([guide]);
  });

  it("leaves out resources that don't mention the keyword", () => {
    expect(rankGuideListings([base], "spreadsheet")).toEqual([]);
  });
});
