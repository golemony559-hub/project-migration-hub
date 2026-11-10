import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { productStatus } from "@/lib/creator-products";

export type CreatorProductRow = {
  guide: Pick<
    Tables<"guides">,
    "id" | "slug" | "title" | "status" | "published_version_id" | "price_cents" | "currency_code" | "created_at" | "thumbnail_path"
  >;
  latest: Tables<"guide_versions"> | null;
  status: ReturnType<typeof productStatus>;
};

export function useCreatorProducts(userId: string) {
  const [rows, setRows] = useState<CreatorProductRow[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [guides, versions] = await Promise.all([
      supabase
        .from("guides")
        .select("id, slug, title, status, published_version_id, price_cents, currency_code, created_at, thumbnail_path")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("guide_versions")
        .select("*")
        .eq("creator_id", userId)
        .order("version_number", { ascending: false }),
    ]);
    if (guides.error || versions.error) {
      setError(guides.error?.message ?? versions.error?.message ?? "Couldn’t load your products.");
      setRows([]);
      return;
    }
    const latestByGuide = new Map<string, Tables<"guide_versions">>();
    for (const v of versions.data ?? []) if (!latestByGuide.has(v.guide_id)) latestByGuide.set(v.guide_id, v);
    setRows(
      (guides.data ?? []).map((guide) => {
        const latest = latestByGuide.get(guide.id) ?? null;
        return { guide, latest, status: productStatus(guide, latest?.state) };
      }),
    );
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, error, reload: load };
}
