import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ExternalLink, Pencil, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreator } from "@/components/creator/creator-context";
import { useCreatorProducts } from "@/components/creator/use-creator-products";
import { useProductStats } from "@/components/creator/use-product-stats";
import { DashHeading, ProductThumb, StatusBadge } from "@/components/creator/product-bits";
import { useThumbnailUrls } from "@/hooks/use-thumbnail-urls";
import { formatGuidePrice } from "@/lib/marketplace-data";

export const Route = createFileRoute("/dashboard/products/")({
  head: () => ({
    meta: [
      { title: "Products | Creator dashboard | Doerly" },
      { name: "description", content: "Add, edit and track the review status of your products." },
      { property: "og:title", content: "Products | Creator dashboard | Doerly" },
      {
        property: "og:description",
        content: "Add, edit and track the review status of your products.",
      },
    ],
  }),
  component: ProductsPage,
});

const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "pending", label: "Pending review" },
  { key: "attention", label: "Needs changes" },
  { key: "draft", label: "Drafts" },
] as const;

function ProductsPage() {
  const { user } = useCreator();
  const { rows, error } = useCreatorProducts(user.id);
  const stats = useProductStats();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const thumbs = useThumbnailUrls(
    (rows ?? []).map((r) => r.latest?.thumbnail_path ?? r.guide.thumbnail_path),
  );
  const visible = (rows ?? []).filter((r) => filter === "all" || r.status.tone === filter);

  return (
    <>
      <DashHeading eyebrow="Products" title="Your products">
        <Button asChild>
          <Link to="/dashboard/products/new">
            <Plus aria-hidden="true" /> Add new product
          </Link>
        </Button>
      </DashHeading>
      <div className="filter-pills" role="tablist" aria-label="Filter products">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={filter === f.key ? "is-active" : ""}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {rows && (
              <span>
                {f.key === "all" ? rows.length : rows.filter((r) => r.status.tone === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>
      {error && <p className="studio-feedback is-error">{error}</p>}
      {rows === null ? (
        <p className="app-muted">Loading your products…</p>
      ) : visible.length === 0 ? (
        <div className="dash-section dash-empty">
          <p>{rows.length ? "No products in this view." : "You haven’t added any products yet."}</p>
          {!rows.length && (
            <Button asChild>
              <Link to="/dashboard/products/new">Add your first product</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="product-list">
          {visible.map((r) => {
            const v = r.latest;
            const path = v?.thumbnail_path ?? r.guide.thumbnail_path;
            const priceCents = v?.price_cents ?? r.guide.price_cents;
            const isLive = Boolean(r.guide.published_version_id) && r.guide.status === "published";
            return (
              <li key={r.guide.id} className="product-list-item">
                <ProductThumb
                  url={path ? thumbs[path] : undefined}
                  title={v?.title ?? r.guide.title}
                />
                <div className="product-list-main">
                  <div className="product-list-top">
                    <StatusBadge {...r.status} />
                    <span className="app-muted">
                      {v?.category} · {v?.format}
                    </span>
                  </div>
                  <h3>{v?.title ?? r.guide.title}</h3>
                  <p>{v?.summary}</p>
                  <p className="product-counts" aria-label="Purchases and downloads">
                    <span>
                      <ShoppingBag aria-hidden="true" />
                      <strong>{stats ? (stats[r.guide.id]?.purchases ?? 0) : "–"}</strong> purchases
                    </span>
                    <span>
                      <Download aria-hidden="true" />
                      <strong>{stats ? (stats[r.guide.id]?.downloads ?? 0) : "–"}</strong> downloads
                    </span>
                  </p>
                  {v?.review_reason &&
                    (v.state === "changes_requested" || v.state === "rejected") && (
                      <p className="review-note">
                        <strong>Reviewer:</strong> {v.review_reason}
                      </p>
                    )}
                </div>
                <div className="product-list-side">
                  <strong>
                    {priceCents === 0
                      ? "Free"
                      : formatGuidePrice(priceCents, v?.currency_code ?? "USD")}
                  </strong>
                  <div className="product-list-actions">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/dashboard/products/$guideId" params={{ guideId: r.guide.id }}>
                        <Pencil aria-hidden="true" />{" "}
                        Manage
                      </Link>
                    </Button>
                    {isLive && (
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/guide/$slug" params={{ slug: r.guide.slug }}>
                          <ExternalLink aria-hidden="true" /> View live
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
