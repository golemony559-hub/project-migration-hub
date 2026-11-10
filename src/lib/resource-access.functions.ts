import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emailCreatorFirstDownload } from "./download-links.server";
import { siteOrigin } from "./site-origin.server";

const DOWNLOADS_PER_HOUR = 20;
const LINK_SECONDS = 120;

/**
 * Issues a short-lived download link for a resource the caller holds.
 * Entitlement is checked through the caller's own access rules; only then is a
 * signed link created for the exact version they received.
 */
export const getResourceDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { entitlementId: string }) => {
    if (typeof input?.entitlementId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.entitlementId)) {
      throw new Error("Invalid request.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: entitlement, error } = await supabase
      .from("entitlements")
      .select("id, buyer_id, guide_id, version_id, revoked_at")
      .eq("id", data.entitlementId)
      .eq("buyer_id", userId)
      .maybeSingle();
    if (error) throw new Error("We couldn’t check your access. Please try again.");
    if (!entitlement || entitlement.revoked_at) throw new Error("You don’t have access to this resource.");

    const { data: version, error: versionError } = await supabase
      .from("guide_versions")
      .select("file_path, file_name, access_format")
      .eq("id", entitlement.version_id)
      .maybeSingle();
    if (versionError || !version) throw new Error("We couldn’t find this resource version.");
    if (!version.file_path) throw new Error("This resource is a reference page and has no download.");

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("access_events")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", userId)
      .eq("kind", "download")
      .gte("created_at", since);
    if ((count ?? 0) >= DOWNLOADS_PER_HOUR) {
      throw new Error("Too many downloads in the last hour. Please try again later.");
    }

    const { error: logError } = await supabase
      .from("access_events")
      .insert({ buyer_id: userId, entitlement_id: entitlement.id, kind: "download" });
    if (logError) throw new Error("We couldn’t record this download. Please try again.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("creator-guides")
      .createSignedUrl(version.file_path, LINK_SECONDS, {
        download: version.file_name ?? true,
      });
    if (signError || !signed) throw new Error("We couldn’t prepare the download. Please try again.");

    const { data: first } = await supabaseAdmin.rpc("mark_guide_first_download", {
      p_guide_id: entitlement.guide_id,
    });
    if (first) {
      try {
        await emailCreatorFirstDownload(entitlement.guide_id, siteOrigin());
      } catch (e) {
        console.error("first-download email failed", e);
      }
    }

    return { url: signed.signedUrl, expiresInSeconds: LINK_SECONDS };
  });
