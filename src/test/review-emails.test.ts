import { describe, expect, it } from "vitest";
import { ADMIN_REVIEW_EMAIL, adminReviewRequestEmail, creatorApprovedEmail } from "@/lib/review-emails";

describe("review emails", () => {
  it("go to the admin address the owner chose", () => {
    expect(ADMIN_REVIEW_EMAIL).toBe("otienoalvine925@gmail.com");
  });

  it("escape creator-written titles so they can't inject HTML", () => {
    const email = adminReviewRequestEmail({
      title: '<img src=x onerror="alert(1)">',
      creatorName: "Amina",
      category: "Farming & food",
      version: 1,
      origin: "https://doerly.example",
    });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x");
  });

  it("link the approval email to the live product page", () => {
    const email = creatorApprovedEmail({
      title: "Chicks",
      creatorName: "Amina",
      slug: "chicks-123",
      reason: "",
      origin: "https://doerly.example",
    });
    expect(email.text).toContain("https://doerly.example/guide/chicks-123");
  });
});

describe("creator welcome email", () => {
  it("links to the creator help page", async () => {
    const { creatorWelcomeEmail } = await import("@/lib/review-emails");
    const email = creatorWelcomeEmail({ creatorName: "Amina", origin: "https://doerly.example" });
    expect(email.html).toContain('href="https://doerly.example/creator-help"');
    expect(email.text).toContain("https://doerly.example/creator-help");
  });

  it("escapes the creator's name", async () => {
    const { creatorWelcomeEmail } = await import("@/lib/review-emails");
    const email = creatorWelcomeEmail({ creatorName: "<b>x</b>", origin: "https://doerly.example" });
    expect(email.html).not.toContain("<b>x</b>");
  });
});

describe("creator help search", () => {
  it("finds the thumbnail rules and nothing for nonsense", async () => {
    const { searchHelp } = await import("@/lib/creator-help");
    expect(searchHelp("thumbnail").sections.map((s) => s.id)).toContain("create-product");
    const none = searchHelp("zzqxv");
    expect(none.sections.length + none.faqs.length).toBe(0);
  });
});
