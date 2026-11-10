import { describe, expect, it } from "vitest";
import { parseProductPrice, productStatus, resolveProductMime } from "@/lib/creator-products";

describe("creator products", () => {
  it("free products cost nothing", () => {
    expect(parseProductPrice("free", "25")).toEqual({ ok: true, cents: 0 });
  });

  it("paid products need a price", () => {
    expect(parseProductPrice("paid", "").ok).toBe(false);
    expect(parseProductPrice("paid", "12.50")).toEqual({ ok: true, cents: 1250 });
  });

  it("a newly submitted product shows as pending review", () => {
    expect(productStatus({ status: "draft", published_version_id: null }, "in_review").label).toBe(
      "Pending review",
    );
  });

  it("an approved, published product shows as live", () => {
    expect(productStatus({ status: "published", published_version_id: "v1" }, "approved").label).toBe(
      "Live",
    );
  });

  it("accepts pdf, mp4, excel and image files", () => {
    expect(resolveProductMime("guide.pdf", "")).toBe("application/pdf");
    expect(resolveProductMime("lesson.mp4", "video/mp4")).toBe("video/mp4");
    expect(resolveProductMime("budget.xlsx", "")).toContain("spreadsheetml");
    expect(resolveProductMime("photo.jpg", "image/jpeg")).toBe("image/jpeg");
    expect(resolveProductMime("malware.exe", "application/x-msdownload")).toBeNull();
  });
});
