// Shared labels and rules for resource versions, review, access and support.
// Server-side rules live in database functions; these mirror them for the UI.

export type VersionState =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "rejected"
  | "approved"
  | "superseded";

export const versionStateLabels: Record<VersionState, string> = {
  draft: "Draft — editing",
  in_review: "Draft — in review",
  changes_requested: "Changes requested",
  rejected: "Rejected — private",
  approved: "Approved / Published",
  superseded: "Earlier approved version",
};

export function isEditableState(state: string) {
  return state === "draft" || state === "changes_requested";
}

export const reviewRubric = [
  {
    key: "problem_audience",
    label: "Specific problem and audience",
    standard:
      "Identifies who it is for, the task or problem, context, prerequisites and relevant limits.",
  },
  {
    key: "practical_value",
    label: "Practical value and completeness",
    standard:
      "The promised asset is present, complete enough for its stated scope and usable — not padded generic text.",
  },
  {
    key: "creator_claims",
    label: "Creator context and claims",
    standard:
      "Experience is described accurately; nothing self-described is presented as verified; no guaranteed outcomes.",
  },
  {
    key: "evidence_safety",
    label: "Evidence, currency and safe use",
    standard:
      "Consequential claims include sources, dates, context or cautions. Risk-sensitive advice is escalated.",
  },
  {
    key: "listing_fidelity",
    label: "Listing fidelity and delivery",
    standard:
      "Title, preview, format, contents, file and price match the listing; files open and tools work.",
  },
  {
    key: "rights_disclosure",
    label: "Rights, originality and disclosure",
    standard:
      "The creator has rights to distribute the material; AI assistance or third-party content is disclosed.",
  },
] as const;

export type RubricKey = (typeof reviewRubric)[number]["key"];
export type RubricResult = Partial<Record<RubricKey, boolean>>;

export type ReviewDecision = "approved" | "changes_requested" | "rejected";

/** Mirrors review_guide_version: why a decision can't be recorded yet, or null when it can. */
export function reviewBlocker(input: {
  decision: ReviewDecision;
  reason: string;
  rubric: RubricResult;
  needsEscalation: boolean;
  specialistReviewed: boolean;
}): string | null {
  if (input.reason.trim().length < 5) return "Record a reason for this decision.";
  if (input.decision !== "approved") return null;
  if (!reviewRubric.every((check) => input.rubric[check.key] === true)) {
    return "Every quality check must pass before approval.";
  }
  if (input.needsEscalation && !input.specialistReviewed) {
    return "Risk-sensitive material needs a specialist review before approval.";
  }
  return null;
}

export const aiAssistanceOptions = [
  { value: "none", label: "No AI assistance" },
  { value: "editing", label: "AI used for editing or formatting only" },
  { value: "drafting", label: "AI helped draft some sections" },
  { value: "substantial", label: "Substantial AI-generated content" },
] as const;

export function aiAssistanceLabel(value: string) {
  return aiAssistanceOptions.find((option) => option.value === value)?.label ?? value;
}

export function needsAiDisclosure(value: string) {
  return value === "drafting" || value === "substantial";
}

export const accessFormatOptions = [
  { value: "download", label: "Secure download" },
  { value: "reference", label: "Reference page on Doerly" },
  { value: "both", label: "Download and reference page" },
] as const;

export function accessFormatLabel(value: string) {
  return accessFormatOptions.find((option) => option.value === value)?.label ?? value;
}

export const supportedResourceFiles = {
  extensions: [".pdf", ".docx", ".epub", ".xlsx", ".csv"],
  mimeTypes: [
    "application/pdf",
    "application/epub+zip",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  maxBytes: 50 * 1024 * 1024,
};

export const resourceFileAccept = [
  ...supportedResourceFiles.extensions,
  ...supportedResourceFiles.mimeTypes,
].join(",");

const mimeByExtension: Record<string, string> = {
  ".pdf": "application/pdf",
  ".epub": "application/epub+zip",
  ".csv": "text/csv",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Returns the stored MIME type for a supported file, or an error message. */
export function checkResourceFile(file: { name: string; type: string; size: number }):
  | { ok: true; mime: string }
  | { ok: false; error: string } {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const mime = mimeByExtension[extension];
  if (!mime) return { ok: false, error: "Use a PDF, DOCX, EPUB, XLSX or CSV file." };
  if (file.size === 0) return { ok: false, error: "This file is empty." };
  if (file.size > supportedResourceFiles.maxBytes) {
    return { ok: false, error: "Files can be up to 50 MB." };
  }
  if (file.type && !supportedResourceFiles.mimeTypes.includes(file.type)) {
    return { ok: false, error: "This file’s contents don’t match a supported type." };
  }
  return { ok: true, mime };
}

export const licenseTerms = {
  personal: {
    title: "Personal license",
    summary: "For one buyer’s own internal use.",
    points: [
      "You may use, print and keep this resource for your own work, household, farm or business.",
      "Do not resell, publicly repost, share the file or give access to others.",
      "Do not use it to train AI models or build competing products.",
      "Recommend it by sharing the listing link, not the file.",
    ],
  },
  team: {
    title: "Team license",
    summary: "For one team, farm, cooperative or organization.",
    points: [
      "Members of one named team or organization may use this resource internally.",
      "Do not resell, publicly repost or share it outside your organization.",
      "Do not use it to train AI models or build competing products.",
    ],
  },
} as const;

export const supportCaseTypes = [
  { value: "access_failure", label: "I can’t access or download it" },
  { value: "corrupted_file", label: "The file is corrupted or won’t open" },
  { value: "wrong_file", label: "I received the wrong file" },
  { value: "listing_mismatch", label: "It doesn’t match its description" },
  { value: "unsafe_content", label: "It contains unsafe or harmful advice" },
  { value: "rights_infringement", label: "It copies my work or someone else’s" },
  { value: "other", label: "Something else" },
] as const;

export function supportCaseLabel(value: string) {
  return supportCaseTypes.find((item) => item.value === value)?.label ?? value;
}

export const resolutionActions = [
  { value: "access_restored", label: "Access restored" },
  { value: "replacement_provided", label: "Corrected or replacement material provided" },
  { value: "listing_corrected", label: "Listing corrected" },
  { value: "refund_processed", label: "Refund processed" },
  { value: "takedown", label: "Resource taken down" },
  { value: "no_action", label: "No action needed" },
  { value: "other", label: "Other" },
] as const;

export function splitLines(value: string | null | undefined) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export function parseTags(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 1)
        .slice(0, 12),
    ),
  ];
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
