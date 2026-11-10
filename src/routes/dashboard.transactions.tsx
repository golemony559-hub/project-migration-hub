import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useCreator } from "@/components/creator/creator-context";
import { DashHeading } from "@/components/creator/product-bits";
import { summarizeLedger } from "@/lib/earnings";
import { formatGuidePrice } from "@/lib/marketplace-data";

export const Route = createFileRoute("/dashboard/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions | Creator dashboard | Doerly" },
      { name: "description", content: "Free claims, sales and payouts for your products." },
      { property: "og:title", content: "Transactions | Creator dashboard | Doerly" },
      { property: "og:description", content: "Free claims, sales and payouts for your products." },
    ],
  }),
  component: TransactionsPage,
});

type OrderRow = Pick<
  Tables<"orders">,
  | "id"
  | "order_reference"
  | "status"
  | "amount_cents"
  | "currency_code"
  | "license_type"
  | "created_at"
> & {
  guides: { title: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  free: "Free claim",
  paid: "Sale",
  pending: "Awaiting payment",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function TransactionsPage() {
  const { user } = useCreator();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [ledger, setLedger] = useState<Tables<"ledger_entries">[]>([]);
  const [payouts, setPayouts] = useState<Tables<"payouts">[]>([]);

  useEffect(() => {
    void Promise.all([
      supabase
        .from("orders")
        .select(
          "id, order_reference, status, amount_cents, currency_code, license_type, created_at, guides(title)",
        )
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("ledger_entries").select("*").eq("creator_id", user.id),
      supabase
        .from("payouts")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false }),
    ]).then(([o, l, p]) => {
      setOrders((o.data as OrderRow[] | null) ?? []);
      setLedger(l.data ?? []);
      setPayouts(p.data ?? []);
    });
  }, [user.id]);

  const summary = summarizeLedger(ledger)[0];

  return (
    <>
      <DashHeading eyebrow="Transactions" title="Transactions" />
      <div className="stat-grid">
        <div className="stat-card">
          <span>Gross sales</span>
          <strong>{formatGuidePrice(summary?.grossSales ?? 0, summary?.currency ?? "USD")}</strong>
        </div>
        <div className="stat-card">
          <span>Available balance</span>
          <strong>{formatGuidePrice(summary?.available ?? 0, summary?.currency ?? "USD")}</strong>
        </div>
        <div className="stat-card">
          <span>On hold</span>
          <strong>{formatGuidePrice(summary?.pending ?? 0, summary?.currency ?? "USD")}</strong>
        </div>
        <div className="stat-card">
          <span>Paid out</span>
          <strong>{formatGuidePrice(summary?.paidOut ?? 0, summary?.currency ?? "USD")}</strong>
        </div>
      </div>
      <p className="dash-callout">
        Paid checkout isn’t switched on yet, so for now you’ll mostly see free claims here.
      </p>
      <section className="dash-section">
        <h2>Orders & claims</h2>
        {orders === null ? (
          <p className="app-muted">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="app-muted">
            No transactions yet. When someone gets one of your products, it shows here.
          </p>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td>{o.guides?.title ?? "—"}</td>
                    <td>{STATUS_LABELS[o.status] ?? o.status}</td>
                    <td className="mono">{o.order_reference}</td>
                    <td className="num">
                      {o.amount_cents === 0
                        ? "Free"
                        : formatGuidePrice(o.amount_cents, o.currency_code)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="dash-section">
        <h2>Payouts</h2>
        {payouts.length === 0 ? (
          <p className="app-muted">No payouts yet.</p>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="mono">{p.reference}</td>
                    <td>{p.status}</td>
                    <td className="num">{formatGuidePrice(p.amount_cents, p.currency_code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
