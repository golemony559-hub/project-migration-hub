import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { OVERALL_LABELS, QUALITY_CRITERIA, type QualityOverall } from "@/lib/quality-check";
import { runQualityCheck } from "@/lib/quality-check.functions";

type Check = Tables<"version_quality_checks">;

/** Automatic quality & originality check results for one version. */
export function QualityReport({ versionId, audience }: { versionId: string; audience: "creator" | "admin" }) {
  const run = useServerFn(runQualityCheck);
  const [check, setCheck] = useState<Check | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("version_quality_checks")
      .select("*")
      .eq("version_id", versionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setCheck(data ?? null);
  }, [versionId]);
  useEffect(() => void load(), [load]);

  async function rerun() {
    setBusy(true);
    setMsg("");
    try {
      const r = await run({ data: { versionId } });
      if (!r.ok) setMsg(r.error);
      await load();
    } catch {
      setMsg("The automatic check couldn’t run. Please try again.");
    }
    setBusy(false);
  }

  if (check === undefined) return null;
  const scores = (check?.scores ?? {}) as Record<string, number>;
  const overall = check?.overall as QualityOverall | undefined;

  return (
    <section className={audience === "admin" ? "qc-report qc-admin" : "dash-section qc-report"} aria-label="Automatic quality check">
      <h2>
        <ShieldCheck aria-hidden="true" /> Quality & originality check
      </h2>
      {!check ? (
        <p className="app-muted">
          {audience === "creator"
            ? "When you submit for review, Doerly runs an automatic check on completeness, accuracy, relevance, readability, evidence and originality. You can also run it now."
            : "No automatic check yet."}
        </p>
      ) : (
        <>
          <p className={`qc-overall qc-${overall}`}>
            <strong>{overall ? OVERALL_LABELS[overall] : ""}</strong>{" "}
            <span className="app-muted">· {new Date(check.created_at).toLocaleString()}</span>
          </p>
          {check.summary && <p>{check.summary}</p>}
          <ul className="qc-scores">
            {QUALITY_CRITERIA.map((c) => (
              <li key={c.key}>
                <span>{c.label}</span>
                <span className="qc-bar" aria-hidden="true">
                  <span style={{ width: `${((scores[c.key] ?? 0) / 5) * 100}%` }} />
                </span>
                <strong>{scores[c.key] ?? "–"}/5</strong>
              </li>
            ))}
          </ul>
          {check.flags.length > 0 && (
            <>
              <h3>Things to look at</h3>
              <ul className="qc-list">
                {check.flags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          )}
          {check.suggestions.length > 0 && (
            <>
              <h3>Suggestions</h3>
              <ul className="qc-list">
                {check.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          <p className="field-hint">
            This automatic check guides {audience === "creator" ? "you and our reviewers" : "your review"}. It
            can’t prove originality — a person makes the final decision.
          </p>
        </>
      )}
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void rerun()}>
        {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}{" "}
        {check ? "Run the check again" : "Run the check now"}
      </Button>
      {msg && <p className="studio-feedback is-error">{msg}</p>}
    </section>
  );
}
