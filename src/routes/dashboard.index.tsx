import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Coffee,
  Download,
  FilePen,
  History,
  MessageSquareWarning,
  Plus,
  Receipt,
  Send,
  Sparkles,
  UserRound,
  X,
  XCircle,
  Zap,
  type LucideIcon,
  LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useCreator } from "@/components/creator/creator-context";
import { useCreatorProducts } from "@/components/creator/use-creator-products";
import { DashHeading, ProductThumb, StatusBadge } from "@/components/creator/product-bits";
import { useThumbnailUrls } from "@/hooks/use-thumbnail-urls";
import { formatGuidePrice } from "@/lib/marketplace-data";
import { buildCreatorActivity, type ActivityItem, type ActivityKind } from "@/lib/creator-activity";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Overview | Creator dashboard | Doerly" },
      { name: "description", content: "Your products, reviews and activity at a glance." },
      { property: "og:title", content: "Overview | Creator dashboard | Doerly" },
      { property: "og:description", content: "Your products, reviews and activity at a glance." },
    ],
  }),
  component: OverviewPage,
});

type Stats = { claims: number; sales: number; revenue: number; downloads: number };

const ACTIVITY_ICONS: Record<ActivityKind, LucideIcon> = {
  draft: FilePen,
  submitted: Send,
  approved: CheckCircle2,
  changes: MessageSquareWarning,
  rejected: XCircle,
  claim: Download,
  sale: Receipt,
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

function OverviewPage() {
  const { user, profile } = useCreator();
  const { rows } = useCreatorProducts(user.id);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [notices, setNotices] = useState<Tables<"notifications">[]>([]);
  const thumbs = useThumbnailUrls(
    (rows ?? []).map((r) => r.latest?.thumbnail_path ?? r.guide.thumbnail_path),
  );

  useEffect(() => {
    void supabase.rpc("creator_product_stats").then(({ data }) => {
      const list = data ?? [];
      setStats({
        claims: list.reduce((n, r) => n + Number(r.claims), 0),
        sales: list.reduce((n, r) => n + Number(r.paid_orders), 0),
        revenue: list.reduce((n, r) => n + Number(r.revenue_cents), 0),
        downloads: list.reduce((n, r) => n + Number(r.downloads), 0),
      });
    });
    void supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setNotices(data ?? []));
    void Promise.all([
      supabase
        .from("guide_versions")
        .select("id, guide_id, title, version_number, created_at, submitted_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("guide_reviews")
        .select("id, guide_id, decision, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("orders")
        .select("id, guide_id, status, amount_cents, currency_code, created_at, paid_at")
        .eq("creator_id", user.id)
        .in("status", ["free", "paid"])
        .order("created_at", { ascending: false })
        .limit(20),
    ]).then(([v, r, o]) =>
      setActivity(
        buildCreatorActivity({ versions: v.data ?? [], reviews: r.data ?? [], orders: o.data ?? [] }),
      ),
    );
  }, [user.id]);

  async function dismiss(id: string) {
    setNotices((list) => list.filter((n) => n.id !== id));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }

  const count = (tone: string) => (rows ?? []).filter((r) => r.status.tone === tone).length;
  const live = (rows ?? []).filter(
    (r) => r.guide.published_version_id && r.guide.status === "published",
  ).length;
  const attention = count("attention");

  const quickActions: {
    to:
      | "/dashboard/products/new"
      | "/dashboard/products"
      | "/dashboard/profile"
      | "/dashboard/settings"
      | "/dashboard/analytics"
      | "/creator-help";
    label: string;
    hint: string;
    icon: LucideIcon;
  }[] = [
    {
      to: "/dashboard/products/new",
      label: "Add a product",
      hint: "Upload a file and list it",
      icon: Plus,
    },
    {
      to: "/dashboard/products/new",
      label: "Write a listing with AI",
      hint: "Turn your notes into a full listing",
      icon: Sparkles,
    },
    {
      to: "/dashboard/products",
      label: attention ? `Fix ${attention} product${attention > 1 ? "s" : ""}` : "Manage products",
      hint: attention ? "Reviewers asked for changes" : "Edit, submit or unlist",
      icon: FilePen,
    },
    { to: "/dashboard/profile", label: "Update your profile", hint: "What buyers see", icon: UserRound },
    {
      to: "/dashboard/settings",
      label: profile.coffee_url ? "Change tip link" : "Add a tip link",
      hint: "“Buy me a coffee” on free products",
      icon: Coffee,
    },
    { to: "/dashboard/analytics", label: "See analytics", hint: "Downloads, sales, ratings", icon: BarChart3 },
    { to: "/creator-help", label: "Creator help", hint: "Step-by-step guides and answers", icon: LifeBuoy },
  ];

  return (
    <>
      <DashHeading eyebrow="Overview" title={`Welcome back, ${profile.display_name.split(" ")[0]}`}>
        <Button asChild>
          <Link to="/dashboard/products/new">
            <Plus aria-hidden="true" /> Add new product
          </Link>
        </Button>
      </DashHeading>

      {notices.length > 0 && (
        <ul className="notice-list" aria-label="New notices">
          {notices.map((n) => (
            <li key={n.id}>
              <Bell aria-hidden="true" />
              <span>
                <strong>{n.title}</strong>
                <small>{n.body}</small>
              </span>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Dismiss “${n.title}”`}
                onClick={() => void dismiss(n.id)}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="stat-grid">
        <StatCard label="Live products" value={live} />
        <StatCard label="Pending review" value={count("pending")} />
        <StatCard label="Need your attention" value={attention} />
        <StatCard label="Free downloads claimed" value={stats?.claims ?? "–"} />
        <StatCard
          label="Sales"
          value={stats?.sales ?? "–"}
          hint={stats ? formatGuidePrice(stats.revenue, "USD") : undefined}
        />
      </div>

      <section className="dash-section" aria-labelledby="quick-actions">
        <h2 id="quick-actions">
          <Zap aria-hidden="true" /> Quick actions
        </h2>
        <ul className="quick-actions">
          {quickActions.map((a) => (
            <li key={a.label}>
              <Link to={a.to}>
                <a.icon aria-hidden="true" />
                <span>
                  <strong>{a.label}</strong>
                  <small>{a.hint}</small>
                </span>
                <ArrowRight aria-hidden="true" className="quick-actions-arrow" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="dash-two-col">
        <section className="dash-section" aria-labelledby="recent-activity">
          <h2 id="recent-activity">
            <History aria-hidden="true" /> Recent activity
          </h2>
          {activity === null ? (
            <p className="app-muted">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="app-muted">
              Drafts, submissions, review decisions, downloads and sales will show up here.
            </p>
          ) : (
            <ol className="activity-feed">
              {activity.map((item) => {
                const Icon = ACTIVITY_ICONS[item.kind];
                return (
                  <li key={item.id} className={`is-${item.kind}`}>
                    <span className="activity-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <Link to="/dashboard/products/$guideId" params={{ guideId: item.guideId }}>
                      <strong>{item.title}</strong>
                      {item.detail && <span>{item.detail}</span>}
                    </Link>
                    <time dateTime={item.at}>{timeAgo(item.at)}</time>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="dash-section">
          <div className="dash-section-head">
            <h2>Recent products</h2>
            <Link to="/dashboard/products" className="dash-link">
              All products <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          {rows === null ? (
            <p className="app-muted">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="dash-empty">
              <p>You haven’t added a product yet.</p>
              <Button asChild size="sm">
                <Link to="/dashboard/products/new">Add your first product</Link>
              </Button>
            </div>
          ) : (
            <ul className="mini-product-list">
              {rows.slice(0, 5).map((r) => {
                const path = r.latest?.thumbnail_path ?? r.guide.thumbnail_path;
                return (
                  <li key={r.guide.id}>
                    <Link to="/dashboard/products/$guideId" params={{ guideId: r.guide.id }}>
                      <ProductThumb
                        url={path ? thumbs[path] : undefined}
                        title={r.latest?.title ?? r.guide.title}
                        size="sm"
                      />
                      <span className="mini-product-title">{r.latest?.title ?? r.guide.title}</span>
                      <StatusBadge {...r.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string | undefined;
}) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}
