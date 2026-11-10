import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { askCreator } from "@/lib/creator-questions.functions";
import { firstName } from "@/lib/creator-questions";
export function AskCreatorButton({ guideId, guideTitle, creatorName }: { guideId: string; guideTitle: string; creatorName: string }) {
  const send = useServerFn(askCreator);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const meta = data.user.user_metadata;
      const value = meta['full_name'] ?? meta['name'];
      if (typeof value === 'string') setName(n => n || value);
      setEmail(e => e || data.user?.email || "");
    });
    return () => { active = false; };
  }, [open]);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" className="ask-trigger">Ask the creator</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Ask about {guideTitle}</DialogTitle><DialogDescription>The creator will answer by email and may also publish the question and answer on this page.</DialogDescription></DialogHeader>
      {sent ? <p role="status">Sent! {firstName(creatorName)} will reply to you by email.</p> : <form className="ask-form" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError("");
        try { const result = await send({ data: { guideId, name, email, question, honeypot } }); if (result.ok) setSent(true); else setError(result.error); }
        catch { setError("We couldn't send your question. Please try again."); } finally { setBusy(false); }
      }}>
        <label>Your name<input required maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Your email<input required type="email" maxLength={255} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Your question<textarea required minLength={5} maxLength={2000} rows={5} value={question} onChange={e => setQuestion(e.target.value)} aria-describedby="ask-counter" /></label>
        <small id="ask-counter">{question.length}/2000 characters</small>
        <div className="ask-honeypot" aria-hidden="true"><label>Leave this empty<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} /></label></div>
        {error && <p role="alert">{error}</p>}<Button disabled={busy} type="submit">{busy ? "Sending…" : "Send question"}</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}
type PublicAnswer = { id: string; asker_name: string; question: string; answer: string | null; answered_at: string | null };
export function PublicAnswers({ guideId }: { guideId: string }) {
  const [rows, setRows] = useState<PublicAnswer[]>([]);
  useEffect(() => {
    let active = true; setRows([]);
    void supabase.from("creator_questions").select("id, asker_name, question, answer, answered_at").eq("guide_id", guideId).eq("is_public", true).eq("status", "answered").not("answer", "is", null).order("answered_at", { ascending: false }).then(({ data }) => { if (active) setRows(data ?? []); });
    return () => { active = false; };
  }, [guideId]);
  if (!rows.length) return null;
  return <section className="ask-public detail-afterword"><h2>Questions &amp; answers</h2>{rows.map(row => <article className="ask-row" key={row.id}><strong>{firstName(row.asker_name)}</strong><p className="ask-copy">{row.question}</p><strong>Creator’s answer</strong><p className="ask-copy">{row.answer}</p>{row.answered_at && <time dateTime={row.answered_at}>{new Date(row.answered_at).toLocaleDateString()}</time>}</article>)}</section>;
}
