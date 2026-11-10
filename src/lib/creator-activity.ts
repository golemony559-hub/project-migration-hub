/** Builds the creator's "Recent activity" feed from their versions, reviews and orders. */

export type ActivityKind = "draft" | "submitted" | "approved" | "changes" | "rejected" | "claim" | "sale";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  at: string;
  guideId: string;
};

type VersionIn = {
  id: string;
  guide_id: string;
  title: string;
  version_number: number;
  created_at: string;
  submitted_at: string | null;
};
type ReviewIn = { id: string; guide_id: string; decision: string; reason: string; created_at: string };
type OrderIn = {
  id: string;
  guide_id: string;
  status: string;
  amount_cents: number;
  currency_code: string;
  created_at: string;
  paid_at: string | null;
};

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

export function buildCreatorActivity(
  input: { versions: VersionIn[]; reviews: ReviewIn[]; orders: OrderIn[] },
  limit = 8,
): ActivityItem[] {
  const titles = new Map<string, string>();
  // Newest version title wins so the feed uses the current product name.
  for (const v of [...input.versions].sort((a, b) => a.version_number - b.version_number)) {
    titles.set(v.guide_id, v.title);
  }
  const name = (guideId: string) => titles.get(guideId) ?? "a product";
  const items: ActivityItem[] = [];

  for (const v of input.versions) {
    items.push({
      id: `draft-${v.id}`,
      kind: "draft",
      title: v.version_number > 1 ? `Started an update to ${v.title}` : `Created ${v.title}`,
      detail: v.version_number > 1 ? `Version ${v.version_number} draft` : "New draft",
      at: v.created_at,
      guideId: v.guide_id,
    });
    if (v.submitted_at) {
      items.push({
        id: `submitted-${v.id}`,
        kind: "submitted",
        title: `Submitted ${v.title} for review`,
        detail: "Pending review",
        at: v.submitted_at,
        guideId: v.guide_id,
      });
    }
  }

  for (const r of input.reviews) {
    // Only reviews of this creator's own products (admins can read everyone's).
    if (!titles.has(r.guide_id)) continue;
    const kind: ActivityKind =
      r.decision === "approved" ? "approved" : r.decision === "changes_requested" ? "changes" : "rejected";
    const verb =
      kind === "approved" ? "is approved and live" : kind === "changes" ? "needs changes" : "was not approved";
    items.push({
      id: `review-${r.id}`,
      kind,
      title: `${name(r.guide_id)} ${verb}`,
      detail: r.reason,
      at: r.created_at,
      guideId: r.guide_id,
    });
  }

  for (const o of input.orders) {
    if (o.status === "free") {
      items.push({
        id: `order-${o.id}`,
        kind: "claim",
        title: `Someone got ${name(o.guide_id)}`,
        detail: "Free download",
        at: o.paid_at ?? o.created_at,
        guideId: o.guide_id,
      });
    } else if (o.status === "paid") {
      items.push({
        id: `order-${o.id}`,
        kind: "sale",
        title: `New sale: ${name(o.guide_id)}`,
        detail: money(o.amount_cents, o.currency_code),
        at: o.paid_at ?? o.created_at,
        guideId: o.guide_id,
      });
    }
  }

  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}
