import { describe, expect, it } from "vitest";
import { downloadLinkExpiry, PAID_LINK_HOURS } from "@/lib/download-links";

describe("emailed download link expiry", () => {
  const now = new Date("2026-11-10T09:00:00.000Z");

  it("paid products: the link expires 6 hours after it is sent", () => {
    expect(PAID_LINK_HOURS).toBe(6);
    expect(downloadLinkExpiry(500, now)?.toISOString()).toBe("2026-11-10T15:00:00.000Z");
  });

  it("free products: the link has no time limit", () => {
    expect(downloadLinkExpiry(0, now)).toBeNull();
  });
});
