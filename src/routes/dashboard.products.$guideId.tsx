import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FilePlus2,
  LoaderCircle,
  Pencil,
  Send,
  ShoppingBag,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendSubmissionEmails } from "@/lib/review-emails.functions";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useCreator } from "@/components/creator/creator-context";
import { useProductStats } from "@/components/creator/use-product-stats";
import { ProductForm } from "@/components/creator/product-form";
import { DashHeading, ProductThumb, StatusBadge } from "@/components/creator/product-bits";
import { useThumbnailUrls } from "@/hooks/use-thumbnail-urls";
import { productStatus } from "@/lib/creator-products";
import { formatGuidePrice } from "@/lib/marketplace-data";

export const Route = createFileRoute("/dashboard/products/$guideId")({
  head: () => ({
    meta: [
      { title: "Manage product | Creator dashboard | Doerly" },
      {
        name: "description",
        content: "Edit your product, follow its review and manage its listing.",
      },
      { property: "og:title", content: "Manage product | Creator dashboard | Doerly" },
      {
        property: "og:description",
        content: "Edit your product, follow its review and manage its listing.",
      },
    ],
  }),
  component: ManageProductPage,
});

type Guide = Tables<"guides">;
type Version = Tables<"guide_versions">;
type Review = Tables<"guide_reviews">;

const DECISION_LABELS: Record<string, string> = {
  approved: "Approved & published",
  changes_requested: "Changes requested",
  rejected: "Not approved",
};

function ManageProductPage() {
  const { guideId } = Route.useParams();
  const { user } = useCreator();
  const stats = useProductStats();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const sendEmails = useServerFn(sendSubmissionEmails);
  const emailReviewers = (versionId: string) => () =>
    void sendEmails({ data: { versionId } }).catch((e: unknown) =>
      console.error("submission emails failed", e),
    );
  const [formKey, setFormKey] = useState(0);
  const thumbs = useThumbnailUrls([version?.thumbnail_path]);

  const load = useCallback(async () => {
    const [g, v, r] = await Promise.all([
      supabase.from("guides").select("*").eq("id", guideId).eq("creator_id", user.id).maybeSingle(),
      supabase
        .from("guide_versions")
        .select("*")
        .eq("guide_id", guideId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("guide_reviews")
        .select("*")
        .eq("guide_id", guideId)
        .order("created_at", { ascending: false }),
    ]);
    setGuide(g.data);
    setVersion(v.data);
    setReviews(r.data ?? []);
    setLoaded(true);
    setFormKey((k) => k + 1);
  }, [guideId, user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    fn: () => PromiseLike<{ error: { message: string } | null }>,
    ok: string,
    then?: () => void,
  ) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(ok);
    await load();
    then?.();
  }

  if (!loaded) return <LoaderCircle className="animate-spin" aria-label="Loading product" />;
  if (!guide || !version) {
    return (
      <div className="dash-section dash-empty">
        <p>We couldn’t find this product.</p>
        <Button asChild variant="outline">
          <Link to="/dashboard/products">Back to products</Link>
        </Button>
      </div>
    );
  }

  const status = productStatus(guide, version.state);
  const editable = version.state === "draft" || version.state === "changes_requested";
  const hasLive = Boolean(guide.published_version_id);
  const isListed = hasLive && guide.status === "published";
  const thumbUrl = version.thumbnail_path ? thumbs[version.thumbnail_path] : undefined;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="dash-back">
        <Link to="/dashboard/products">
          <ArrowLeft aria-hidden="true" /> Products
        </Link>
      </Button>
      <DashHeading eyebrow={`Version ${version.version_number}`} title={version.title}>
        <StatusBadge {...status} />
      </DashHeading>
      <p className="product-counts" aria-label="Purchases and downloads">
        <span>
          <ShoppingBag aria-hidden="true" />
          <strong>{stats ? (stats[guide.id]?.purchases ?? 0) : "–"}</strong> purchases
        </span>
        <span>
          <Download aria-hidden="true" />
          <strong>{stats ? (stats[guide.id]?.downloads ?? 0) : "–"}</strong> downloads
        </span>
      </p>

      <div className="product-actions-bar">
        {isListed && (
          <Button asChild size="sm" variant="outline">
            <Link to="/guide/$slug" params={{ slug: guide.slug }}>
              <ExternalLink aria-hidden="true" /> View live page
            </Link>
          </Button>
        )}
        {editable && !editing && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" /> Edit
          </Button>
        )}
        {version.state === "draft" && !editing && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void act(
                () => supabase.rpc("submit_guide_version", { p_version_id: version.id }),
                "Submitted — your product is pending review.",
                emailReviewers(version.id),
              )
            }
          >
            <Send aria-hidden="true" /> Submit for review
          </Button>
        )}
        {version.state === "changes_requested" && !editing && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void act(
                () => supabase.rpc("submit_guide_version", { p_version_id: version.id }),
                "Resubmitted — pending review again.",
                emailReviewers(version.id),
              )
            }
          >
            <Send aria-hidden="true" /> Resubmit for review
          </Button>
        )}
        {version.state === "in_review" && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void act(
                () => supabase.rpc("withdraw_guide_version", { p_version_id: version.id }),
                "Withdrawn — you can edit it again.",
              )
            }
          >
            <Undo2 aria-hidden="true" /> Withdraw to edit
          </Button>
        )}
        {(version.state === "approved" ||
          version.state === "rejected" ||
          version.state === "superseded") && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void act(
                () => supabase.rpc("start_guide_revision", { p_guide_id: guide.id }),
                "Editing started. Your live page stays up until the update is approved.",
                () => setEditing(true),
              )
            }
          >
            <FilePlus2 aria-hidden="true" /> Edit product
          </Button>
        )}
        {hasLive && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void act(
                () =>
                  supabase.rpc("set_guide_listing", {
                    p_guide_id: guide.id,
                    p_listed: !isListed,
                    p_reason: "",
                  }),
                isListed ? "Hidden from the marketplace." : "Listed on the marketplace again.",
              )
            }
          >
            {isListed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}{" "}
            {isListed ? "Unlist" : "Relist"}
          </Button>
        )}
        {!hasLive && version.state !== "in_review" && (
          <Button
            size="sm"
            variant="ghost"
            className="danger-text"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm("Delete this product? This can’t be undone.")) return;
              setBusy(true);
              const { error } = await supabase.from("guides").delete().eq("id", guide.id);
              setBusy(false);
              if (error) {
                toast.error(error.message);
                return;
              }
              toast.success("Product deleted.");
              void navigate({ to: "/dashboard/products" });
            }}
          >
            <Trash2 aria-hidden="true" /> Delete
          </Button>
        )}
      </div>

      {version.state === "in_review" && (
        <p className="dash-callout is-pending">
          Your product is pending review. An admin will approve it, request changes, or leave a
          comment — you’ll be notified.
        </p>
      )}
      {version.review_reason &&
        (version.state === "changes_requested" || version.state === "rejected") && (
          <p className="dash-callout is-attention">
            <strong>Reviewer comment:</strong> {version.review_reason}
          </p>
        )}

      {editable && editing ? (
        <ProductForm
          key={formKey}
          userId={user.id}
          version={version}
          onCancel={() => setEditing(false)}
          onDone={({ submitted, message }) => {
            if (submitted) toast.success(message);
            else toast(message);
            setEditing(false);
            void load();
          }}
        />
      ) : (
        <section className="dash-section product-summary">
          <ProductThumb url={thumbUrl} title={version.title} size="lg" />
          <dl className="readonly-fields">
            <div>
              <dt>Product name</dt>
              <dd>{version.title}</dd>
            </div>
            <div>
              <dt>Category · type · price</dt>
              <dd>
                {version.category} · {version.format} ·{" "}
                {version.price_cents === 0
                  ? "Free"
                  : formatGuidePrice(version.price_cents, version.currency_code)}
              </dd>
            </div>
            <div>
              <dt>Overview</dt>
              <dd>{version.summary || "—"}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd className="pre-line">{version.description || "—"}</dd>
            </div>
            <div>
              <dt>What buyers will gain</dt>
              <dd className="pre-line">{version.outcomes || "—"}</dd>
            </div>
            {version.sources_note && (
              <div>
                <dt>Sources, dates & cautions</dt>
                <dd className="pre-line">{version.sources_note}</dd>
              </div>
            )}
            <div>
              <dt>Search tags</dt>
              <dd>{version.tags.length ? version.tags.join(", ") : "—"}</dd>
            </div>
            <div>
              <dt>File</dt>
              <dd>{version.file_name ?? "—"}</dd>
            </div>
          </dl>
          {editable && (
            <p className="field-hint readonly-hint">
              These details are locked. Press <strong>Edit</strong> to change them or to let AI fill
              them in.
            </p>
          )}
        </section>
      )}

      <section className="dash-section">
        <h2>Review history</h2>
        {reviews.length === 0 ? (
          <p className="app-muted">No review decisions yet.</p>
        ) : (
          <ul className="review-history">
            {reviews.map((r) => (
              <li key={r.id}>
                <StatusBadge
                  label={DECISION_LABELS[r.decision] ?? r.decision}
                  tone={r.decision === "approved" ? "live" : "attention"}
                />
                <p>{r.reason}</p>
                <small>{new Date(r.created_at).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
