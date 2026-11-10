import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateProductFields } from "@/lib/product-autofill.functions";
import {
  AUTOFILL_NOTES_MAX_CHARS,
  AUTOFILL_NOTES_MIN_CHARS,
  type ProductAutofillFields,
} from "@/lib/product-autofill";

type Current = {
  title: string;
  summary: string;
  description: string;
  outcomes: string;
  category: string;
  format: string;
  sourcesNote: string;
};

type Props = {
  versionId?: string | undefined;
  current: Current;
  onFill: (fields: ProductAutofillFields) => void;
  onUndo?: (() => void) | undefined;
  canUndo: boolean;
};

export function ProductAutofill({ versionId, current, onFill, onUndo, canUndo }: Props) {
  const generate = useServerFn(generateProductFields);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const tooShort = notes.trim().length < AUTOFILL_NOTES_MIN_CHARS;

  async function run() {
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const result = await generate({ data: { versionId: versionId ?? null, notes, current } });
      if (!result.ok) setError(result.error);
      else {
        onFill(result.fields);
        setDone(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dash-section autofill-panel" aria-label="Fill in with AI">
      <div className="autofill-head">
        <Sparkles aria-hidden="true" />
        <div>
          <h2>Fill everything in with AI</h2>
          <p className="app-muted">
            Describe your product in your own words — or paste your notes or outline. The AI fills
            in the name, overview, description, benefits, category, type, sources and tags. Nothing
            is saved until you review it and press save.
          </p>
        </div>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        maxLength={AUTOFILL_NOTES_MAX_CHARS}
        aria-label="Your notes for the AI"
        placeholder="e.g. I’ve raised layer chickens for 12 years. This guide covers setting up a brooder, feeding chicks in the first eight weeks and spotting early illness…"
      />
      <div className="autofill-actions">
        <Button type="button" size="sm" disabled={busy || tooShort} onClick={() => void run()}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Sparkles aria-hidden="true" />}
          {busy ? "Writing…" : "Fill in all fields"}
        </Button>
        {canUndo && onUndo && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              onUndo();
              setDone(false);
            }}
          >
            <Undo2 aria-hidden="true" /> Undo AI changes
          </Button>
        )}
        <small className="field-hint">
          {tooShort
            ? `At least ${AUTOFILL_NOTES_MIN_CHARS} characters needed.`
            : `${notes.length.toLocaleString()} characters`}
        </small>
      </div>
      {done && (
        <p className="dash-callout is-pending" role="status">
          Fields filled in below. Check every field and change anything that isn’t right before
          saving.
        </p>
      )}
      {error && (
        <p className="studio-feedback is-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
