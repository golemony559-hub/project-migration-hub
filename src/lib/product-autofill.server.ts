import {
  generateResponse,
  GatewayError,
  PaymentRequiredError,
  RateLimitError,
} from "@lovable.dev/ai-gateway";
import { LISTING_MAX_TAGS } from "./listing-assistant";
import { parseProductAutofill, type ProductAutofillFields } from "./product-autofill";

const MODEL = "openai/gpt-6-astra";

export type ProductAutofillResult =
  | { ok: true; fields: ProductAutofillFields }
  | { ok: false; error: string };

type Current = {
  title: string;
  summary: string;
  description: string;
  outcomes: string;
  category: string;
  format: string;
  sourcesNote: string;
};

function instructions(categories: string[], formats: readonly string[]) {
  return `You help creators on Doerly — a marketplace of practical know-how from people with first-hand experience — fill in their product listing.
From the creator's notes (and any fields they already wrote), return JSON with:
- "title": a clear, specific product name, 5–80 characters, no clickbait.
- "summary": 1–2 sentences (max 260 characters) on the problem it solves and for whom.
- "description": 120–220 words in 2–3 short plain-text paragraphs (no markdown, no emojis): what it is, who it helps, what's inside.
- "outcomes": 3–6 concrete things a buyer will gain, one per line, no bullets or numbering.
- "category": exactly one of: ${categories.join(" | ")}.
- "format": exactly one of: ${formats.join(" | ")}.
- "sources_note": where the information comes from, when it was last checked and any cautions — based only on the notes; empty string if the notes say nothing about it.
- "tags": 5–${LISTING_MAX_TAGS} short lowercase search tags (1–3 words each).
Voice: write as the creator (first person, "I") and speak to the buyer as "you"; never refer to "the creator" or "the author".
Rules: use only facts present in the notes or existing fields. Never invent credentials, results, statistics, guarantees, prices or testimonials. No medical, legal or financial promises. Keep good existing text and improve it rather than replacing it with something unrelated. Write in the same language as the notes.`;
}

export async function suggestProductFields(
  notes: string,
  current: Current,
  categories: string[],
  formats: readonly string[],
): Promise<ProductAutofillResult> {
  const existing = Object.entries(current)
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  try {
    const response = await generateResponse({
      model: MODEL,
      instructions: instructions(categories, formats),
      input: [
        {
          role: "user",
          content: `Creator's notes:\n"""\n${notes}\n"""\n\nFields already filled in:\n${existing || "(none)"}\n\nReturn JSON.`,
        },
      ],
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "product_fields",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "title",
              "summary",
              "description",
              "outcomes",
              "category",
              "format",
              "sources_note",
              "tags",
            ],
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              description: { type: "string" },
              outcomes: { type: "string" },
              category: { type: "string", enum: categories },
              format: { type: "string", enum: [...formats] },
              sources_note: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    });

    let text = "";
    for (const item of response.output ?? []) {
      if (item.type !== "message") continue;
      for (const part of item.content) {
        if (part.type === "output_text") text += part.text;
        if (part.type === "refusal") {
          return { ok: false, error: "The AI helper couldn’t write a listing from these notes." };
        }
      }
    }
    const fields = parseProductAutofill(text, { categories, formats });
    if (!fields) {
      return { ok: false, error: "The AI helper returned an unusable answer. Please try again." };
    }
    return { ok: true, fields };
  } catch (error) {
    if (error instanceof PaymentRequiredError) {
      return { ok: false, error: "The AI helper is out of credits right now. Please try again later." };
    }
    if (error instanceof RateLimitError) {
      return { ok: false, error: "The AI helper is busy. Please wait a minute and try again." };
    }
    if (error instanceof GatewayError) {
      console.error("product autofill gateway error", error.code, error.ids);
      return { ok: false, error: "The AI helper isn’t available right now. Please try again shortly." };
    }
    throw error;
  }
}
