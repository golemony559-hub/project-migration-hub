import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreator } from "@/components/creator/creator-context";
import { useCreatorProducts } from "@/components/creator/use-creator-products";
import { DashHeading, StatusBadge } from "@/components/creator/product-bits";
import { formatGuidePrice } from "@/lib/marketplace-data";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics | Creator dashboard | Doerly" },
      {
        name: "description",
        content: "See how your products are doing: claims, sales, downloads and ratings.",
      },
      { property: "og:title", content: "Analytics | Creator dashboard | Doerly" },
      {
        property: "og:description",
        content: "See how your products are doing: claims, sales, downloads and ratings.",
      },
    ],
  }),
  component: AnalyticsPage,
});

type StatRow = {
  guide_id: string;
  claims: number;
  paid_orders: number;
  revenue_cents: number;
  downloads: number;
  feedback_count: number;
  avg_rating: number | null;
};

function AnalyticsPage() {
  const { user } = useCreator();
  const { rows } = useCreatorProducts(user.id);
  const [stats, setStats] = useState<Record<string, StatRow> | null>(null);

  useEffect(() => {
    void supabase.rpc("creator_product_stats").then(({ data }) => {
      const map: Record<string, StatRow> = {};
      for (const r of data ?? []) {
        map[r.guide_id] = {
          guide_id: r.guide_id,
          claims: Number(r.claims),
          paid_orders: Number(r.paid_orders),
          revenue_cents: Number(r.revenue_cents),
          downloads: Number(r.downloads),
          feedback_count: Number(r.feedback_count),
          avg_rating: r.avg_rating === null ? null : Number(r.avg_rating),
        };
      }
      setStats(map);
    });
  }, []);

  const all = Object.values(stats ?? {});
  const totals = {
    claims: all.reduce((n, r) => n + r.claims, 0),
    sales: all.reduce((n, r) => n + r.paid_orders, 0),
    revenue: all.reduce((n, r) => n + r.revenue_cents, 0),
    downloads: all.reduce((n, r) => n + r.downloads, 0),
    reviews: all.reduce((n, r) => n + r.feedback_count, 0),
  };
  const maxReach = Math.max(1, ...all.map((r) => r.claims + r.paid_orders));

  return (
    <>
      <DashHeading eyebrow="Analytics" title="How your products are doing" />
      <div className="stat-grid">
        <div className="stat-card">
          <span>Free claims</span>
          <strong>{totals.claims}</strong>
        </div>
        <div className="stat-card">
          <span>Sales</span>
          <strong>{totals.sales}</strong>
          <small>{formatGuidePrice(totals.revenue, "USD")}</small>
        </div>
        <div className="stat-card">
          <span>Downloads</span>
          <strong>{totals.downloads}</strong>
        </div>
        <div className="stat-card">
          <span>Reader reviews</span>
          <strong>{totals.reviews}</strong>
        </div>
      </div>
      <section className="dash-section">
        <h2>By product</h2>
        {rows === null || stats === null ? (
          <p className="app-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="app-muted">Add a product to start seeing numbers here.</p>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Reach</th>
                  <th className="num">Claims</th>
                  <th className="num">Sales</th>
                  <th className="num">Downloads</th>
                  <th className="num">Rating</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = stats[r.guide.id];
                  const reach = (s?.claims ?? 0) + (s?.paid_orders ?? 0);
                  return (
                    <tr key={r.guide.id}>
                      <td>
                        <Link to="/dashboard/products/$guideId" params={{ guideId: r.guide.id }}>
                          {r.latest?.title ?? r.guide.title}
                        </Link>
                      </td>
                      <td>
                        <StatusBadge {...r.status} />
                      </td>
                      <td>
                        <span className="reach-bar" aria-label={`${reach} people`}>
                          <span style={{ width: `${(reach / maxReach) * 100}%` }} />
                        </span>
                      </td>
                      <td className="num">{s?.claims ?? 0}</td>
                      <td className="num">{s?.paid_orders ?? 0}</td>
                      <td className="num">{s?.downloads ?? 0}</td>
                      <td className="num">
                        {s?.avg_rating ? (
                          <>
                            <Star aria-hidden="true" className="inline-star" /> {s.avg_rating} (
                            {s.feedback_count})
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
