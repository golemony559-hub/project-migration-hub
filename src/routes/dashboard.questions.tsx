import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useCreator } from "@/components/creator/creator-context";
import { DashHeading } from "@/components/creator/product-bits";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { answerQuestion, setQuestionVisibility } from "@/lib/creator-questions.functions";
export const Route = createFileRoute("/dashboard/questions")({
  head: () => ({ meta: [ { title: "Questions | Doerly" }, { name: "description", content: "Answer questions about your products." }, { property: "og:title", content: "Questions | Doerly" }, { property: "og:description", content: "Answer questions about your products." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: QuestionsPage,
});
type Row = { id: string; asker_name: string; question: string; answer: string | null; status: string; is_public: boolean; created_at: string; guides: { title: string } | null };
function QuestionsPage() {
  const { user } = useCreator();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("open");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const { data, error } = await supabase.from("creator_questions").select("id, asker_name, question, answer, status, is_public, created_at, guides(title)").eq("creator_id", user.id).order("created_at", { ascending: false });
    setError(error ? "Couldn't load your questions. Please try again." : "");
    if (!error) setRows(data ?? []);
    setLoading(false);
  }, [user.id]);
  useEffect(() => { void reload(); }, [reload]);
  return <><DashHeading title="Questions" eyebrow="Your readers" /><div className="filter-pills" role="group" aria-label="Filter questions">{["open", "answered", "all"].map(key => <button key={key} className={filter === key ? "is-active" : ""} aria-pressed={filter === key} onClick={() => setFilter(key)}>{key === "open" ? "Open" : key === "answered" ? "Answered" : "All"}</button>)}</div>
    {error && <p role="alert">{error} <Button variant="outline" onClick={() => void reload()}>Retry</Button></p>}
    {loading ? <p role="status">Loading questions…</p> : !error && !rows.some(r => filter === "all" || r.status === filter) ? <p>No questions here yet.</p> : null}
    {rows.filter(r => filter === "all" || r.status === filter).map(row => <QuestionRow key={row.id} row={row} reload={reload} />)}</>;
}
function QuestionRow({ row, reload }: { row: Row; reload: () => Promise<void> }) {
  const send = useServerFn(answerQuestion);
  const visibility = useServerFn(setQuestionVisibility);
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState(row.answer ?? "");
  const [isPublic, setIsPublic] = useState(row.is_public);
  const [busy, setBusy] = useState(false);
  return <article className="ask-row"><h2>{row.guides?.title ?? "Product"}</h2><p>{row.asker_name} · <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time></p><p className="ask-copy">{row.question}</p>
    {row.answer && <><strong>Your answer</strong><p className="ask-copy">{row.answer}</p><p>{row.is_public ? "Public on the product page" : "Private — not shown on the product page"}</p></>}
    {!editing ? <div className="ask-actions"><Button variant="outline" onClick={() => { setAnswer(row.answer ?? ""); setIsPublic(row.is_public); setEditing(true); }}>{row.answer ? "Edit answer" : "Answer"}</Button>{row.status === "answered" && <Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true); try { const result = await visibility({ data: { questionId: row.id, isPublic: !row.is_public } }); if (!result.ok) toast.error(result.error); else await reload(); } catch { toast.error("Couldn't change visibility."); } finally { setBusy(false); }
    }}>{row.is_public ? "Hide publicly" : "Show publicly"}</Button>}</div> : <form className="ask-form" onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      try { const result = await send({ data: { questionId: row.id, answer, isPublic } }); if (!result.ok) toast.error(result.error); else { toast.success("Answer saved."); setEditing(false); window.dispatchEvent(new Event("ask-questions-changed")); await reload(); } } catch { toast.error("Couldn't save your answer. Please try again."); } finally { setBusy(false); }
    }}><label>Your answer<textarea required maxLength={4000} rows={6} value={answer} onChange={e => setAnswer(e.target.value)} /></label><small>{answer.length}/4000 characters</small><label className="ask-checkbox"><input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />Also show this question and answer publicly on the product page</label><div className="ask-actions"><Button disabled={busy || !answer.trim()} type="submit">{busy ? "Saving…" : "Send answer"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button></div></form>}
  </article>;
}
