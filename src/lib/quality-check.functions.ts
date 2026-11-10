import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runQualityCheckFor } from "./quality-check.server";

const RERUN_SECONDS = 120;

/** Runs the automatic quality check for a version the caller owns (or any version, for admins). */
export const runQualityCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { versionId: string }) => {
    if (typeof input?.versionId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.versionId)) throw new Error("Invalid request.");
    return { versionId: input.versionId };
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { ok: false; error: string }> => {
    // Row rules only return the version to its creator or to an admin.
    const { data: v } = await context.supabase.from("guide_versions").select("id").eq("id", data.versionId).maybeSingle();
    if (!v) return { ok: false, error: "Product version not found." };
    const { data: last } = await context.supabase
      .from("version_quality_checks")
      .select("created_at")
      .eq("version_id", v.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last && Date.now() - Date.parse(last.created_at) < RERUN_SECONDS * 1000) {
      return { ok: false, error: "This was just checked. Please wait a couple of minutes before running it again." };
    }
    return runQualityCheckFor(v.id);
  });
