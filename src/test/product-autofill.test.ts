import { describe, expect, it } from "vitest";
import { parseProductAutofill } from "@/lib/product-autofill";
import { buildCreatorActivity } from "@/lib/creator-activity";

const allowed = { categories: ["Farming & food", "Home & repair"], formats: ["Guide", "Ebook"] };
const good = {
  title: "Healthy chicks: your first eight weeks",
  summary: "Raise chicks safely.",
  description: "A practical guide to brooding, feeding and early illness signs for new keepers.",
  outcomes: "Set up a brooder\nSpot illness",
  category: "Farming & food",
  format: "Guide",
  sources_note: "",
  tags: ["Chickens", "#brooder", "chickens"],
};

describe("AI product fill-in", () => {
  it("keeps the creator's category when the AI picks one outside the list", () => {
    const out = parseProductAutofill(JSON.stringify({ ...good, category: "Crypto" }), allowed);
    expect(out?.category).toBeNull();
  });

  it("keeps the creator's type when the AI picks one outside the list", () => {
    const out = parseProductAutofill(JSON.stringify({ ...good, format: "Course" }), allowed);
    expect(out?.format).toBeNull();
  });

  it("accepts allowed category and type, and cleans tags", () => {
    const out = parseProductAutofill(JSON.stringify(good), allowed);
    expect(out?.category).toBe("Farming & food");
    expect(out?.format).toBe("Guide");
    expect(out?.tags).toEqual(["chickens", "brooder"]);
  });

  it("rejects an answer without a usable name or description", () => {
    expect(parseProductAutofill(JSON.stringify({ ...good, title: "Hi" }), allowed)).toBeNull();
    expect(parseProductAutofill("not json", allowed)).toBeNull();
  });
});

describe("recent activity", () => {
  it("ignores reviews of other creators' products", () => {
    const items = buildCreatorActivity({
      versions: [
        { id: "v1", guide_id: "g1", title: "Mine", version_number: 1, created_at: "2026-11-01T10:00:00Z", submitted_at: null },
      ],
      reviews: [
        { id: "r1", guide_id: "g-other", decision: "approved", reason: "ok", created_at: "2026-11-02T10:00:00Z" },
      ],
      orders: [],
    });
    expect(items.map((i) => i.id)).toEqual(["draft-v1"]);
  });

  it("lists newest first and skips unpaid orders", () => {
    const items = buildCreatorActivity({
      versions: [
        { id: "v1", guide_id: "g1", title: "Mine", version_number: 1, created_at: "2026-11-01T10:00:00Z", submitted_at: "2026-11-01T11:00:00+00:00" },
      ],
      reviews: [
        { id: "r1", guide_id: "g1", decision: "approved", reason: "Great", created_at: "2026-11-02T10:00:00Z" },
      ],
      orders: [
        { id: "o1", guide_id: "g1", status: "free", amount_cents: 0, currency_code: "USD", created_at: "2026-11-03T10:00:00Z", paid_at: null },
        { id: "o2", guide_id: "g1", status: "pending", amount_cents: 500, currency_code: "USD", created_at: "2026-11-04T10:00:00Z", paid_at: null },
      ],
    });
    expect(items.map((i) => i.id)).toEqual(["order-o1", "review-r1", "submitted-v1", "draft-v1"]);
  });
});
