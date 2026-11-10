/** Browser-safe rules shared by the creator dashboard product screens. */

export const PRODUCT_FORMATS = [
  "Guide",
  "Ebook",
  "Playbook",
  "Checklist",
  "Template",
  "Toolkit",
  "Spreadsheet / calculator",
  "Video",
  "Audio",
  "Image pack",
  "Course",
  "Other",
] as const;

export const PRODUCT_FILE_MAX_BYTES = 500 * 1024 * 1024;
export const THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
  csv: "text/csv",
  txt: "text/plain",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export const PRODUCT_FILE_ACCEPT = Object.keys(MIME_BY_EXTENSION)
  .map((ext) => `.${ext}`)
  .join(",");
export const THUMBNAIL_ACCEPT = "image/png,image/jpeg,image/webp";

const SUPPORTED_MIME = new Set([...Object.values(MIME_BY_EXTENSION), "application/x-zip-compressed", "audio/x-wav"]);

/** Picks a supported MIME type from the browser's value or, failing that, the extension. */
export function resolveProductMime(fileName: string, browserType: string): string | null {
  if (browserType && SUPPORTED_MIME.has(browserType)) return browserType;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? null;
}

export function safeStorageName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
}

/** Free products cost 0; paid products need a price of at least 1.00. */
export function parseProductPrice(
  pricing: "free" | "paid",
  priceInput: string,
): { ok: true; cents: number } | { ok: false; error: string } {
  if (pricing === "free") return { ok: true, cents: 0 };
  const amount = Number(priceInput);
  if (!priceInput.trim() || !Number.isFinite(amount)) {
    return { ok: false, error: "Enter a price for your paid product." };
  }
  const cents = Math.round(amount * 100);
  if (cents < 100) return { ok: false, error: "Paid products need a price of at least 1.00." };
  return { ok: true, cents };
}

export type ProductStatusTone = "live" | "pending" | "draft" | "attention" | "muted";

/** What the creator sees as a product's status, from its listing and newest version. */
export function productStatus(
  guide: { status: string; published_version_id: string | null },
  latestState: string | undefined,
): { label: string; tone: ProductStatusTone } {
  const isLive = guide.published_version_id !== null && guide.status === "published";
  const isUnlisted = guide.published_version_id !== null && guide.status === "unlisted";
  if (latestState === "in_review") {
    return isLive ? { label: "Live · update pending", tone: "pending" } : { label: "Pending review", tone: "pending" };
  }
  if (latestState === "changes_requested") return { label: "Changes requested", tone: "attention" };
  if (latestState === "draft") {
    return isLive ? { label: "Live · draft update", tone: "live" } : { label: "Draft", tone: "draft" };
  }
  if (latestState === "rejected" && !isLive) return { label: "Not approved", tone: "attention" };
  if (isLive) return { label: "Live", tone: "live" };
  if (isUnlisted) return { label: "Unlisted", tone: "muted" };
  return { label: "Draft", tone: "draft" };
}

export function isSafeHttpsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !/\s/.test(value.trim());
  } catch {
    return false;
  }
}
