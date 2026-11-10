import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, LockKeyhole, Flag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarketplaceAuthDialog } from "@/components/marketplace-auth-dialog";
import { useMarketplaceAuth } from "@/hooks/use-marketplace-auth";
import { supabase } from "@/integrations/supabase/client";
import { getResourceDownload } from "@/lib/resource-access.functions";
import type { Database } from "@/integrations/supabase/types";

type Feedback = Database["public"]["Tables"]["resource_feedback"]["Row"];
type Entitlement = { id: string; version_id: string; guide_id: string };

export function useDownload() {
  const download = useServerFn(getResourceDownload);
  return async (entitlementId: string) => {
    const result = (await download({ data: { entitlementId } })) as { url?: string } | undefined;
    if (result?.url) window.location.assign(result.url);
  };
}

function useEntitlement(guideId: string) {
  const { user, ready } = useMarketplaceAuth();
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const refresh = useCallback(async () => {
    if (!user) return setEntitlement(null);
    const { data } = await supabase
      .from("entitlements")
      .select("id, version_id, guide_id")
      .eq("guide_id", guideId)
      .eq("buyer_id", user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setEntitlement(data);
  }, [guideId, user]);
  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);
  return { user, entitlement, refresh };
}

export function GuideAccessPanel({ guideId, priceCents, isSample }: { guideId: string; priceCents: number; isSample: boolean }) {
  const { user, entitlement, refresh } = useEntitlement(guideId);
  const download = useDownload();
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function claim() {
    if (!user) return setAuthOpen(true);
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("claim_free_resource", { p_guide_id: guideId });
    setBusy(false);
    if (error) return setMsg(error.message);
    await refresh();
    setMsg("Added to your library.");
  }

  async function doDownload() {
    if (!entitlement) return;
    setBusy(true);
    setMsg("");
    try {
      await download(entitlement.id);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Download failed.");
    }
    setBusy(false);
  }

  if (isSample)
    return (
      <Button className="purchase-unavailable" disabled>
        <LockKeyhole aria-hidden="true" /> Example listing
      </Button>
    );

  return (
    <>
      {entitlement ? (
        <>
          <Button disabled={busy} onClick={() => void doDownload()}>
            <Download aria-hidden="true" /> Download
          </Button>
          <p className="purchase-note">
            In <Link to="/library">your library</Link>.
          </p>
        </>
      ) : priceCents === 0 ? (
        <Button disabled={busy} onClick={() => void claim()}>
          <Download aria-hidden="true" /> Get it free
        </Button>
      ) : (
        <>
          <Button className="purchase-unavailable" disabled>
            <LockKeyhole aria-hidden="true" /> Paid checkout coming soon
          </Button>
          <p className="purchase-note">No payment will be taken yet.</p>
        </>
      )}
      {msg && <p className="purchase-note" role="status">{msg}</p>}
      <MarketplaceAuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}

const CASE_TYPES = [
  ["listing_mismatch", "Listing doesn’t match the file"],
  ["corrupted_file", "File is broken or corrupted"],
  ["wrong_file", "Wrong file delivered"],
  ["access_failure", "I can’t access it"],
  ["unsafe_content", "Unsafe or harmful content"],
  ["rights_infringement", "Copyright / rights concern"],
  ["other", "Something else"],
] as const;

export function GuideCommunity({ guideId }: { guideId: string }) {
  const { user, entitlement } = useEntitlement(guideId);
  const [items, setItems] = useState<Feedback[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [caseType, setCaseType] = useState<string>("listing_mismatch");
  const [details, setDetails] = useState("");
  const [scores, setScores] = useState({ usefulness: 5, clarity: 5, listing_accuracy: 5 });
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("resource_feedback")
      .select("*")
      .eq("guide_id", guideId)
      .eq("status", "visible")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  }, [guideId]);
  useEffect(() => void load(), [load]);

  const mine = user ? items.find((f) => f.buyer_id === user.id) : undefined;

  async function report() {
    if (!user) return setAuthOpen(true);
    const { error } = await supabase.from("support_cases").insert({
      reporter_id: user.id,
      case_type: caseType,
      guide_id: guideId,
      details,
    });
    if (error) return setMsg(error.message.includes("check") ? "Please add at least 10 characters of detail." : error.message);
    setDetails("");
    setReportOpen(false);
    setMsg("Thanks — our team will look into it.");
  }

  async function sendFeedback() {
    if (!user || !entitlement) return;
    const { error } = await supabase.from("resource_feedback").insert({
      buyer_id: user.id,
      guide_id: guideId,
      version_id: entitlement.version_id,
      entitlement_id: entitlement.id,
      ...scores,
      comment,
    });
    if (error) return setMsg(error.message);
    setComment("");
    setMsg("Thanks for your feedback.");
    void load();
  }

  const avg = (k: keyof typeof scores) =>
    items.length ? (items.reduce((s, f) => s + f[k], 0) / items.length).toFixed(1) : "–";

  return (
    <section className="feedback-section" aria-label="Feedback and reports">
      <h2>Verified feedback</h2>
      {items.length > 0 ? (
        <p className="app-muted">
          <Star aria-hidden="true" className="inline size-4" /> Useful {avg("usefulness")} · Clear {avg("clarity")} · Matches listing {avg("listing_accuracy")} ({items.length})
        </p>
      ) : (
        <p className="app-muted">No feedback yet. Only people who got this resource can leave feedback.</p>
      )}
      {items.map((f) => (
        <div key={f.id} className="app-card">
          <p className="app-muted">Useful {f.usefulness}/5 · Clear {f.clarity}/5 · Accurate {f.listing_accuracy}/5</p>
          {f.comment && <p>{f.comment}</p>}
        </div>
      ))}
      {entitlement && !mine && (
        <div className="app-card">
          <h3>Leave feedback</h3>
          <div className="stars-row">
            {(["usefulness", "clarity", "listing_accuracy"] as const).map((k) => (
              <label key={k}>
                {k === "listing_accuracy" ? "Matches listing" : k.charAt(0).toUpperCase() + k.slice(1)}{" "}
                <select value={scores[k]} onChange={(e) => setScores((s) => ({ ...s, [k]: Number(e.target.value) }))}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            ))}
          </div>
          <Textarea maxLength={1000} placeholder="What worked, what didn’t? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button size="sm" onClick={() => void sendFeedback()}>Submit feedback</Button>
        </div>
      )}
      <div>
        <Button variant="ghost" size="sm" onClick={() => (user ? setReportOpen((v) => !v) : setAuthOpen(true))}>
          <Flag aria-hidden="true" /> Report a problem
        </Button>
      </div>
      {reportOpen && (
        <div className="app-card">
          <select value={caseType} onChange={(e) => setCaseType(e.target.value)}>
            {CASE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Textarea placeholder="Describe the problem (at least 10 characters)" value={details} onChange={(e) => setDetails(e.target.value)} />
          <Button size="sm" onClick={() => void report()}>Send report</Button>
        </div>
      )}
      {msg && <p className="purchase-note" role="status">{msg}</p>}
      <MarketplaceAuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </section>
  );
}
