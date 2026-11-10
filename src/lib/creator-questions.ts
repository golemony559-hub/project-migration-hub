import { z } from "zod";
import { buildEmail } from "./review-emails";
export const firstName = (name: string) => name.trim().split(/\s+/)[0] || "the creator";
export const askCreatorSchema = z.object({
  guideId: z.string().uuid(),
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.string().trim().max(255).email("Please enter a valid email.").transform(v => v.toLowerCase()),
  question: z.string().trim().min(5, "Please write at least 5 characters.").max(2000),
  honeypot: z.string().max(2000).default(""),
});
export const visibilitySchema = z.object({ questionId: z.string().uuid(), isPublic: z.boolean() });
export const answerQuestionSchema = visibilitySchema.extend({ answer: z.string().trim().min(1, "Please enter an answer.").max(4000) });
export function questionEmail(name: string, title: string, question: string, origin: string) {
  return buildEmail(`New question about “${title}”`, "A reader has a question", [`${name} asks about “${title}”:`, question], { label: "Answer this question", url: `${origin}/dashboard/questions` });
}
export function answerEmail(title: string, slug: string, question: string, answer: string, origin: string) {
  return buildEmail(`Your question about “${title}” was answered`, "The creator answered your question", [`Your question: ${question}`, `Answer: ${answer}`], { label: "View the product", url: `${origin}/guide/${encodeURIComponent(slug)}` });
}
