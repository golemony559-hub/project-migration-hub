import { generateResponse, GatewayError, PaymentRequiredError, RateLimitError } from "@lovable.dev/ai-gateway";
import { QUALITY_CRITERIA, parseQualityCheck } from "./quality-check";

const MODEL = "openai/gpt-6-astra";
const FILE_SAMPLE_CHARS = 6000;

const INSTRUCTIONS = `You are a quality reviewer for Doerly, a marketplace of practical know-how from people with first-hand experience.
Assess one submitted product from its listing, its contents outline and (when available) a sample of its file. Score each criterion 1–5:
- originality: does it read as the creator's own practical experience rather than generic, copied or mass-produced AI text? Note signs like boilerplate phrasing, no concrete specifics, or text that looks copied from elsewhere. You cannot prove plagiarism — describe signals only.
- completeness: does the product contain what the listing promises, with enough detail to act on?
- accuracy: does the title/summary/description match the contents without overselling?
- relevance: does it fit its category and solve a real, specific problem for the stated audience?
- readability: is it clearly structured, well formatted and easy to follow?
- evidence: are important claims supported with sources, dates, context or cautions where needed (especially health, animal health, money, legal, safety topics)?
Return JSON: "scores" (object with the six keys, integers 1–5), "summary" (2–3 plain sentences for the creator), "flags" (0–6 short specific problems), "suggestions" (0–6 short, actionable improvements, addressed to the creator as "you").
Be fair and specific. Never invent facts about the product.`;

/** Runs the automatic check for one version and stores the result. Returns false if it couldn't run. */
export async function runQualityCheckFor(versionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: v } = await supabaseAdmin
    .from("guide_versions")
    .select(
      "id, guide_id, creator_id, title, summary, description, audience, outcomes, contents, limitations, how_to_use, preview_text, sources_note, tags, category, format, risk_sensitive, reference_content, file_path, file_mime, file_name",
    )
    .eq("id", versionId)
    .maybeSingle();
  if (!v) return { ok: false, error: "Product version not found." };

  const { data: items } = await supabaseAdmin
    .from("product_items")
    .select("section, kind, title, description")
    .eq("version_id", v.id)
    .order("position");

  let fileSample = "";
  if (v.file_path && (v.file_mime ?? "").startsWith("text/")) {
    const { data: blob } = await supabaseAdmin.storage.from("creator-guides").download(v.file_path);
    if (blob) fileSample = (await blob.text()).slice(0, FILE_SAMPLE_CHARS);
  }

  const listing = [
    `Title: ${v.title}`,
    `Category: ${v.category}${v.risk_sensitive ? " (risk-sensitive)" : ""}`,
    `Format: ${v.format}`,
    `Summary: ${v.summary}`,
    `Description: ${v.description}`,
    `Audience: ${v.audience}`,
    `Outcomes: ${v.outcomes}`,
    `Contents: ${v.contents}`,
    `Limitations: ${v.limitations}`,
    `How to use: ${v.how_to_use}`,
    `Preview: ${v.preview_text}`,
    `Sources: ${v.sources_note || "(none given)"}`,
    `Tags: ${(v.tags ?? []).join(", ")}`,
  ].join("\n");
  const outline = (items ?? [])
    .map((i) => `- [${i.kind}] ${i.section ? `${i.section} › ` : ""}${i.title}${i.description ? `: ${i.description.slice(0, 200)}` : ""}`)
    .join("\n");
  const content = [
    `LISTING\n${listing}`,
    `CONTENTS OUTLINE\n${outline || "(single file only)"}`,
    v.reference_content ? `REFERENCE TEXT (sample)\n${v.reference_content.slice(0, FILE_SAMPLE_CHARS)}` : "",
    fileSample
      ? `FILE SAMPLE (${v.file_name})\n${fileSample}`
      : `FILE: ${v.file_name ?? "none"} (content not readable automatically — judge from the listing and outline)`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await generateResponse({
      model: MODEL,
      instructions: INSTRUCTIONS,
      input: [{ role: "user", content: `${content}\n\nReturn JSON.` }],
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "quality_check",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["scores", "summary", "flags", "suggestions"],
            properties: {
              scores: {
                type: "object",
                additionalProperties: false,
                required: QUALITY_CRITERIA.map((c) => c.key),
                properties: Object.fromEntries(QUALITY_CRITERIA.map((c) => [c.key, { type: "integer" }])),
              },
              summary: { type: "string" },
              flags: { type: "array", items: { type: "string" } },
              suggestions: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    });
    let text = "";
    for (const item of response.output ?? []) {
      if (item.type !== "message") continue;
      for (const part of item.content) if (part.type === "output_text") text += part.text;
    }
    const result = parseQualityCheck(text);
    if (!result) return { ok: false, error: "The automatic check returned an unusable answer." };
    const { error } = await supabaseAdmin.from("version_quality_checks").insert({
      version_id: v.id,
      guide_id: v.guide_id,
      creator_id: v.creator_id,
      overall: result.overall,
      scores: result.scores,
      summary: result.summary,
      flags: result.flags,
      suggestions: result.suggestions,
    });
    if (error) return { ok: false, error: "Couldn’t save the check." };
    return { ok: true };
  } catch (error) {
    if (error instanceof PaymentRequiredError) return { ok: false, error: "The automatic check is out of credits right now." };
    if (error instanceof RateLimitError) return { ok: false, error: "The automatic check is busy. Try again in a minute." };
    if (error instanceof GatewayError) {
      console.error("quality check gateway error", error.code, error.ids);
      return { ok: false, error: "The automatic check isn’t available right now." };
    }
    throw error;
  }
}
