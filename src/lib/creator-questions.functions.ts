import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askCreatorSchema, answerQuestionSchema, visibilitySchema, questionEmail, answerEmail } from "./creator-questions";
import { sendReviewEmail } from "./review-emails.server";
import { siteOrigin } from "./site-origin.server";
type Result = { ok: true } | { ok: false; error: string };
export const askCreator = createServerFn({ method: "POST" }).inputValidator((input: unknown) => input).handler(async ({ data }): Promise<Result> => {
  // Bots get the same response without triggering validation, database writes or mail.
  if (data && typeof data === "object" && "honeypot" in data && typeof data.honeypot === "string" && data.honeypot) return { ok: true };
  const parsed = askCreatorSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your question." };
  const p = parsed.data;
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: guide, error: guideError } = await admin.from("guides").select("id, title, creator_id, status, published_version_id").eq("id", p.guideId).maybeSingle();
  if (guideError || !guide || guide.status !== "published" || !guide.published_version_id) return { ok: false, error: "This product is not available for questions." };
  // Escape ILIKE metacharacters so counts match the exact email, including legacy mixed-case rows.
  const emailPattern = p.email.replace(/[\\%_]/g, "\\$&");
  const now = Date.now();
  const [minute, hour] = await Promise.all([
    admin.from("creator_questions").select("id", { count: "exact", head: true }).ilike("asker_email", emailPattern).eq("guide_id", p.guideId).gte("created_at", new Date(now - 60000).toISOString()),
    admin.from("creator_questions").select("id", { count: "exact", head: true }).ilike("asker_email", emailPattern).gte("created_at", new Date(now - 3600000).toISOString()),
  ]);
  if (minute.error || hour.error) return { ok: false, error: "We couldn't send your question. Please try again." };
  if ((minute.count ?? 0) >= 1) return { ok: false, error: "Please wait a minute before asking about this product again." };
  if ((hour.count ?? 0) >= 5) return { ok: false, error: "You've sent five questions this hour. Please try again later." };
  const { data: row, error } = await admin.from("creator_questions").insert({ guide_id: guide.id, creator_id: guide.creator_id, asker_name: p.name, asker_email: p.email, question: p.question }).select("id").single();
  if (error || !row) return { ok: false, error: "We couldn't save your question. Please try again." };
  // Delivery is best-effort; never make a saved question look like a failed submission.
  try {
    await admin.from("notifications").insert({ user_id: guide.creator_id, title: `New question about “${guide.title}”`, body: p.question.slice(0, 140), link: "/dashboard/questions" });
    const { data: account } = await admin.auth.admin.getUserById(guide.creator_id);
    if (account.user?.email) await sendReviewEmail(account.user.email, questionEmail(p.name, guide.title, p.question, siteOrigin()), `question-${row.id}`);
  } catch { /* The question is saved even if delivery is unavailable. */ }
  return { ok: true };
});
export const answerQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => answerQuestionSchema.parse(input)).handler(async ({ data, context }): Promise<Result> => {
  const { data: owned, error: ownershipError } = await context.supabase.from("creator_questions").select("id, creator_id, status").eq("id", data.questionId).eq("creator_id", context.userId).maybeSingle();
  if (ownershipError || !owned) return { ok: false, error: "Question not found." };
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const answeredAt = new Date().toISOString();
  const { data: row, error } = await admin.from("creator_questions").update({ answer: data.answer, answered_at: answeredAt, status: "answered", is_public: data.isPublic }).eq("id", owned.id).eq("creator_id", context.userId).select("id, guide_id, asker_email, question").single();
  if (error || !row) return { ok: false, error: "We couldn't save your answer. Please try again." };
  try {
    const { data: guide } = await admin.from("guides").select("title, slug").eq("id", row.guide_id).single();
    if (guide) await sendReviewEmail(row.asker_email, answerEmail(guide.title, guide.slug, row.question, data.answer, siteOrigin()), `answer-${row.id}-${answeredAt}`);
  } catch { /* Saved answers must survive mail failures. */ }
  return { ok: true };
});
export const setQuestionVisibility = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => visibilitySchema.parse(input)).handler(async ({ data, context }): Promise<Result> => {
  const { data: owned } = await context.supabase.from("creator_questions").select("id, creator_id, status").eq("id", data.questionId).eq("creator_id", context.userId).maybeSingle();
  if (!owned || owned.status !== "answered") return { ok: false, error: "Answered question not found." };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("creator_questions").update({ is_public: data.isPublic }).eq("id", owned.id).eq("creator_id", context.userId);
  return error ? { ok: false, error: "Couldn't change visibility. Please try again." } : { ok: true };
});
