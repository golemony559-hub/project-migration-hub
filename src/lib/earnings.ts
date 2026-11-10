// Creator earnings are an internal record of sales and deductions — not a bank or
// mobile-money wallet. Balances are derived only from ledger rows.

export type LedgerRow = {
  entry_type: string;
  amount_cents: number;
  currency_code: string;
  available_at: string;
};

export type EarningsSummary = {
  currency: string;
  grossSales: number;
  platformFees: number;
  processingFees: number;
  adjustments: number;
  paidOut: number;
  pending: number;
  available: number;
};

export function summarizeLedger(rows: LedgerRow[], now: Date = new Date()): EarningsSummary[] {
  const byCurrency = new Map<string, EarningsSummary>();
  for (const row of rows) {
    const summary = byCurrency.get(row.currency_code) ?? {
      currency: row.currency_code,
      grossSales: 0,
      platformFees: 0,
      processingFees: 0,
      adjustments: 0,
      paidOut: 0,
      pending: 0,
      available: 0,
    };
    if (row.entry_type === "sale") summary.grossSales += row.amount_cents;
    if (row.entry_type === "platform_fee") summary.platformFees += -row.amount_cents;
    if (row.entry_type === "processing_fee") summary.processingFees += -row.amount_cents;
    if (row.entry_type === "adjustment") summary.adjustments += row.amount_cents;
    if (row.entry_type === "payout") summary.paidOut += -row.amount_cents;
    if (new Date(row.available_at) > now) summary.pending += row.amount_cents;
    else summary.available += row.amount_cents;
    byCurrency.set(row.currency_code, summary);
  }
  return [...byCurrency.values()];
}

export const ledgerEntryLabels: Record<string, string> = {
  sale: "Gross sale",
  platform_fee: "Platform fee",
  processing_fee: "Payment processing",
  adjustment: "Adjustment",
  payout: "Payout",
};
