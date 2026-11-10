import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRODUCT_FORMATS } from "./creator-products";
import { AUTOFILL_LIMITS, AUTOFILL_NOTES_MAX_CHARS, AUTOFILL_NOTES_MIN_CHARS } from "./product-autofill";
import { suggestProductFields, type ProductAutofillResult } from "./product-autofill.server";

type Input = {
  /** Existing version being edited; omit while creating a new product. */
  versionId?: string | null;
  notes: string;
  current: {
    title: string;
    summary: string;
    description: string;
    outcomes: string;
    category: string;
    format: string;
    sourcesNote: string;
  };
};

const str = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

/**
 * Suggests values for every product field from the creator's notes.
 * Nothing is saved here — suggestions only fill the form until the creator saves.
 */
export const generateProductFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => {
    const versionId = input?.versionId ?? null;
    if (versionId !== null && (typeof versionId !== "string" || !/^[0-9a-f-]{36}$/i.test(versionId))) {
      throw new Error("Invalid request.");
    }
    const notes = typeof input?.notes === "string" ? input.notes.trim() : "";
    if (notes.length < AUTOFILL_NOTES_MIN_CHARS) {
      throw new Error(`Tell the AI a bit more — at least ${AUTOFILL_NOTES_MIN_CHARS} characters.`);
    }
    const c = input.current ?? ({} as Input["current"]);
    return {
      versionId,
      notes: notes.slice(0, AUTOFILL_NOTES_MAX_CHARS),
      current: {
        title: str(c.title, AUTOFILL_LIMITS.title),
        summary: str(c.summary, AUTOFILL_LIMITS.summary),
        description: str(c.description, AUTOFILL_LIMITS.description),
        outcomes: str(c.outcomes, AUTOFILL_LIMITS.outcomes),
        category: str(c.category, 80),
        format: str(c.format, 40),
        sourcesNote: str(c.sourcesNote, AUTOFILL_LIMITS.sourcesNote),
      },
    };
  })
  .handler(async ({ data, context }): Promise<ProductAutofillResult> => {
    const { supabase, userId } = context;
    if (data.versionId) {
      const { data: version, error } = await supabase
        .from("guide_versions")
        .select("id, state")
        .eq("id", data.versionId)
        .eq("creator_id", userId)
        .maybeSingle();
      if (error) return { ok: false, error: "We couldn’t load this product. Please try again." };
      if (!version) return { ok: false, error: "You can only use the AI helper on your own products." };
      if (version.state !== "draft" && version.state !== "changes_requested") {
        return { ok: false, error: "Start editing this product before using the AI helper." };
      }
    }
    const { data: cats, error: catErr } = await supabase
      .from("categories")
      .select("name")
      .eq("is_active", true)
      .order("sort_order");
    if (catErr || !cats?.length) {
      return { ok: false, error: "We couldn’t load the categories. Please try again." };
    }
    return suggestProductFields(
      data.notes,
      data.current,
      cats.map((c) => c.name),
      PRODUCT_FORMATS,
    );
  });
