import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProductStats = { purchases: number; downloads: number; paid: number; revenueCents: number };

/** Purchases (free claims + paid orders) and downloads for each of the signed-in creator's products. */
export function useProductStats() {
  const [stats, setStats] = useState<Record<string, ProductStats> | null>(null);
  useEffect(() => {
    void supabase.rpc("creator_product_stats").then(({ data }) => {
      const map: Record<string, ProductStats> = {};
      for (const r of data ?? []) {
        map[r.guide_id] = {
          purchases: Number(r.claims) + Number(r.paid_orders),
          paid: Number(r.paid_orders),
          downloads: Number(r.downloads),
          revenueCents: Number(r.revenue_cents),
        };
      }
      setStats(map);
    });
  }, []);
  return stats;
}
