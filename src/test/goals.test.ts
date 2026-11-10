import { describe, expect, it } from "vitest";
import { findGoal, groupForGoal, matchGoal, rankForGoal } from "@/lib/goals";
import { sampleGuides } from "@/lib/marketplace-data";

const base = { ...sampleGuides[0]!, creator_bio: "", description: "", tags: [] as string[] };

describe("goal-based discovery", () => {
  it("recognises a goal typed as a question", () => {
    expect(matchGoal("How do I start a poultry farm?")?.id).toBe("start-poultry-farm");
    expect(matchGoal("learn bookkeeping")?.id).toBe("learn-bookkeeping");
    expect(matchGoal("brooder temperature")).toBeNull();
  });

  it("recommends resources that cover the goal and leaves out unrelated ones", () => {
    const poultry = { ...base, id: "a", title: "Broiler feed plan", summary: "Feeding chicks well." };
    const sewing = { ...base, id: "b", title: "Sewing basics", summary: "Hems and seams.", category: "Business" };
    const ranked = rankForGoal([sewing, poultry], findGoal("start-poultry-farm")!);
    expect(ranked.map((g) => g.id)).toEqual(["a"]);
  });

  it("groups guides before playbooks, templates and toolkits", () => {
    const groups = groupForGoal([
      { ...base, id: "t", format: "Template" },
      { ...base, id: "g", format: "Guide" },
      { ...base, id: "p", format: "Playbook" },
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Start with a guide", "Step-by-step playbooks", "Templates & checklists"]);
  });
});
