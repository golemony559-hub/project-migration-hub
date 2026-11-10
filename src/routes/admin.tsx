import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { sendApprovalEmail } from "@/lib/review-emails.functions";
import { QualityReport } from "@/components/quality-report";
import { CreatorVerificationAdmin } from "@/components/admin/creator-verification";
import { listUsersWithRoles, type AdminUserRow } from "@/lib/admin-users.functions";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { supabase } from "@/integrations/supabase/client";
import { useThumbnailUrls } from "@/hooks/use-thumbnail-urls";
import type { Database } from "@/integrations/supabase/types";
import { formatGuidePrice } from "@/lib/marketplace-data";

type Version = Database["public"]["Tables"]["guide_versions"]["Row"];
type SupportCase = Database["public"]["Tables"]["support_cases"]["Row"];
type Feedback = Database["public"]["Tables"]["resource_feedback"]["Row"];

const RUBRIC: { key: string; label: string }[] = [
  { key: "problem_audience", label: "Clear problem and audience" },
  { key: "practical_value", label: "Practical, actionable value" },
  { key: "creator_claims", label: "Creator claims are reasonable" },
  { key: "evidence_safety", label: "Evidence and safety are adequate" },
  { key: "listing_fidelity", label: "Listing matches the file" },
  { key: "rights_disclosure", label: "Rights and AI disclosure are fine" },
];

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin review | Doerly" },
      { name: "description", content: "Moderate submitted resources, support cases and feedback." },
      { property: "og:title", content: "Admin review | Doerly" },
      { property: "og:description", content: "Doerly moderation workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { ready, isAdmin } = useIsAdmin();
  const [tab, setTab] = useState<"review" | "cases" | "feedback" | "users" | "creators">("review");
  if (!ready)
    return (
      <main className="market-message">
        <LoaderCircle className="animate-spin" aria-label="Loading" />
      </main>
    );
  if (!isAdmin)
    return (
      <main className="market-message">
        <h1>Admins only</h1>
        <p>You need an admin account to open the review workspace.</p>
      </main>
    );
  return (
    <main className="app-page">
      <div>
        <p className="eyebrow">Admin</p>
        <h1>Review workspace</h1>
      </div>
      <div className="app-tabs" role="tablist">
        <Button variant={tab === "review" ? "default" : "outline"} onClick={() => setTab("review")}>
          Review queue
        </Button>
        <Button variant={tab === "cases" ? "default" : "outline"} onClick={() => setTab("cases")}>
          Support cases
        </Button>
        <Button
          variant={tab === "feedback" ? "default" : "outline"}
          onClick={() => setTab("feedback")}
        >
          Feedback
        </Button>
        <Button variant={tab === "users" ? "default" : "outline"} onClick={() => setTab("users")}>
          Users
        </Button>
        <Button variant={tab === "creators" ? "default" : "outline"} onClick={() => setTab("creators")}>
          Creator verification
        </Button>
      </div>
      {tab === "review" && <ReviewQueue />}
      {tab === "cases" && <CaseQueue />}
      {tab === "feedback" && <FeedbackQueue />}
      {tab === "users" && <UsersTable />}
      {tab === "creators" && <CreatorVerificationAdmin />}
    </main>
  );
}

function ReviewQueue() {
  const [items, setItems] = useState<Version[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("guide_versions")
      .select("*")
      .eq("state", "in_review")
      .order("submitted_at", { ascending: true });
    setItems(data ?? []);
  }, []);
  useEffect(() => void load(), [load]);
  if (!items) return <LoaderCircle className="animate-spin" />;
  if (!items.length) return <p className="app-muted">Nothing waiting for review.</p>;
  return (
    <div className="app-grid">
      {items.map((v) => (
        <ReviewCard key={v.id} version={v} onDone={load} />
      ))}
    </div>
  );
}

function ReviewCard({ version: v, onDone }: { version: Version; onDone: () => void }) {
  const [rubric, setRubric] = useState<Record<string, boolean>>({});
  const [specialist, setSpecialist] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const emailCreator = useServerFn(sendApprovalEmail);
  const thumbs = useThumbnailUrls([v.thumbnail_path]);
  const thumbUrl = v.thumbnail_path ? thumbs[v.thumbnail_path] : undefined;

  async function openFile() {
    if (!v.file_path) return;
    const { data, error } = await supabase.storage
      .from("creator-guides")
      .createSignedUrl(v.file_path, 120);
    if (error) return setMsg(error.message);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function decide(decision: "approved" | "changes_requested" | "rejected") {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("review_guide_version", {
      p_version_id: v.id,
      p_decision: decision,
      p_reason: reason,
      p_rubric: rubric,
      p_specialist_reviewed: specialist,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (decision === "approved") {
      // Tell the creator by email; a failed email never undoes the approval.
      void emailCreator({ data: { versionId: v.id } }).catch((e: unknown) =>
        console.error("approval email failed", e),
      );
    }
    onDone();
  }

  return (
    <article className="app-card">
      <p className="app-muted">
        {v.category} · {v.format} · v{v.version_number} ·{" "}
        {v.price_cents === 0 ? "Free" : formatGuidePrice(v.price_cents, v.currency_code)}
        {v.risk_sensitive && " · Risk-sensitive"}
      </p>
      {thumbUrl && <img className="review-thumb" src={thumbUrl} alt={`Thumbnail for ${v.title}`} />}
      <h3>{v.title}</h3>
      <p>{v.summary}</p>
      <details>
        <summary>Full listing</summary>
        <p>
          <strong>Description:</strong> {v.description}
        </p>
        <p>
          <strong>Audience:</strong> {v.audience}
        </p>
        <p>
          <strong>Outcomes:</strong> {v.outcomes}
        </p>
        <p>
          <strong>Contents:</strong> {v.contents}
        </p>
        <p>
          <strong>Limitations:</strong> {v.limitations}
        </p>
        <p>
          <strong>How to use:</strong> {v.how_to_use}
        </p>
        <p>
          <strong>Preview:</strong> {v.preview_text}
        </p>
        <p>
          <strong>Sources:</strong> {v.sources_note || "—"}
        </p>
        <p>
          <strong>AI assistance:</strong> {v.ai_assistance} {v.ai_disclosure}
        </p>
      </details>
      <QualityReport versionId={v.id} audience="admin" />
      {v.file_path && (
        <Button variant="outline" size="sm" onClick={() => void openFile()}>
          Open file ({v.file_name ?? "attachment"})
        </Button>
      )}
      <div className="rubric-list">
        {RUBRIC.map((r) => (
          <label key={r.key}>
            <input
              type="checkbox"
              checked={!!rubric[r.key]}
              onChange={(e) => setRubric((c) => ({ ...c, [r.key]: e.target.checked }))}
            />
            {r.label}
          </label>
        ))}
        <label>
          <input
            type="checkbox"
            checked={specialist}
            onChange={(e) => setSpecialist(e.target.checked)}
          />
          Specialist reviewed (required for risk-sensitive topics)
        </label>
      </div>
      <Textarea
        aria-label="Comment for the creator"
        placeholder="Comment for the creator (required — shown to them with your decision)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="creator-guide-actions">
        <Button size="sm" disabled={busy} onClick={() => void decide("approved")}>
          Approve & publish
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void decide("changes_requested")}
        >
          Request changes
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void decide("rejected")}>
          Reject
        </Button>
      </div>
      {msg && (
        <p className="purchase-note" role="alert">
          {msg}
        </p>
      )}
    </article>
  );
}

function CaseQueue() {
  const [items, setItems] = useState<SupportCase[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("support_cases")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  }, []);
  useEffect(() => void load(), [load]);
  if (!items) return <LoaderCircle className="animate-spin" />;
  if (!items.length) return <p className="app-muted">No support cases.</p>;
  return (
    <div className="app-grid">
      {items.map((c) => (
        <CaseCard key={c.id} item={c} onDone={load} />
      ))}
    </div>
  );
}

function CaseCard({ item: c, onDone }: { item: SupportCase; onDone: () => void }) {
  const [resolution, setResolution] = useState(c.resolution);
  const [action, setAction] = useState(c.resolution_action ?? "no_action");
  const [msg, setMsg] = useState("");
  async function update(status: string) {
    const { error } = await supabase.rpc("update_support_case", {
      p_case_id: c.id,
      p_status: status,
      p_resolution_action:
        status === "resolved" || status === "closed" ? action : (null as unknown as string),
      p_resolution: resolution,
    });
    if (error) return setMsg(error.message);
    onDone();
  }
  return (
    <article className="app-card">
      <p className="app-muted">
        {c.case_type.replace(/_/g, " ")} · {c.status} · {new Date(c.created_at).toLocaleString()}
      </p>
      <p>{c.details}</p>
      <select className="app-select" value={action} onChange={(e) => setAction(e.target.value)}>
        {[
          "access_restored",
          "replacement_provided",
          "listing_corrected",
          "refund_processed",
          "takedown",
          "no_action",
          "other",
        ].map((a) => (
          <option key={a} value={a}>
            {a.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <Textarea
        placeholder="Resolution notes"
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
      />
      <div className="creator-guide-actions">
        <Button size="sm" variant="outline" onClick={() => void update("investigating")}>
          Investigating
        </Button>
        <Button size="sm" onClick={() => void update("resolved")}>
          Resolve
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void update("closed")}>
          Close
        </Button>
      </div>
      {msg && (
        <p className="purchase-note" role="alert">
          {msg}
        </p>
      )}
    </article>
  );
}

function UsersTable() {
  const fetchUsers = useServerFn(listUsersWithRoles);
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchUsers()
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load users."));
  }, [fetchUsers]);
  if (error) return <p className="app-muted">{error}</p>;
  if (!rows) return <LoaderCircle className="animate-spin" />;
  if (!rows.length) return <p className="app-muted">No accounts yet.</p>;
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "Never");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Person</TableHead>
          <TableHead>Roles</TableHead>
          <TableHead>Products</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Last sign-in</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((u) => (
          <TableRow key={u.id}>
            <TableCell>
              <div>{u.name || "—"}</div>
              <div className="app-muted">
                {u.email}
                {u.confirmed ? "" : " · email not verified"}
              </div>
            </TableCell>
            <TableCell>{u.roles.join(", ")}</TableCell>
            <TableCell>{u.products}</TableCell>
            <TableCell>{date(u.joinedAt)}</TableCell>
            <TableCell>{date(u.lastSignInAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FeedbackQueue() {
  const [items, setItems] = useState<Feedback[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("resource_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setItems(data ?? []);
  }, []);
  useEffect(() => void load(), [load]);
  async function moderate(f: Feedback) {
    const next = f.status === "visible" ? "hidden" : "visible";
    const reason =
      next === "hidden" ? (window.prompt("Reason for hiding this feedback?") ?? "") : "Restored";
    const { error } = await supabase.rpc("moderate_feedback", {
      p_feedback_id: f.id,
      p_status: next,
      p_reason: reason,
    });
    if (error) window.alert(error.message);
    void load();
  }
  if (!items) return <LoaderCircle className="animate-spin" />;
  if (!items.length) return <p className="app-muted">No feedback yet.</p>;
  return (
    <div className="app-grid">
      {items.map((f) => (
        <article key={f.id} className="app-card">
          <p className="app-muted">
            Useful {f.usefulness}/5 · Clear {f.clarity}/5 · Accurate {f.listing_accuracy}/5 ·{" "}
            {f.status}
          </p>
          <p>{f.comment || "(no comment)"}</p>
          <Button size="sm" variant="outline" onClick={() => void moderate(f)}>
            {f.status === "visible" ? "Hide" : "Restore"}
          </Button>
        </article>
      ))}
    </div>
  );
}
