import { describe, expect, it } from "vitest";
import { askCreatorSchema, answerQuestionSchema, firstName, questionEmail, answerEmail } from "../lib/creator-questions";
const valid = { guideId: "11111111-1111-4111-8111-111111111111", name: " Jane Doe ", email: " JANE@EXAMPLE.COM ", question: "Hello there", honeypot: "" };
describe("creator question rules", () => {
  it("trims names and normalizes email", () => { expect(askCreatorSchema.parse(valid)).toMatchObject({ name: "Jane Doe", email: "jane@example.com" }); });
  it("enforces question limits after trimming", () => {
    for (const question of ["four", "     ", "a".repeat(2001)]) expect(askCreatorSchema.safeParse({ ...valid, question }).success).toBe(false);
    for (const question of ["abcde", "a".repeat(2000)]) expect(askCreatorSchema.safeParse({ ...valid, question }).success).toBe(true);
  });
  it("validates identity fields", () => {
    for (const patch of [{ name: "" }, { name: "a".repeat(101) }, { email: "not email" }, { guideId: "wrong" }]) expect(askCreatorSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it("enforces answer limits", () => {
    for (const answer of ["", "   ", "x".repeat(4001)]) expect(answerQuestionSchema.safeParse({ questionId: valid.guideId, answer, isPublic: false }).success).toBe(false);
    expect(answerQuestionSchema.parse({ questionId: valid.guideId, answer: "x".repeat(4000), isPublic: true }).answer.length).toBe(4000);
  });
  it("extracts only the first name", () => { expect(firstName("  Jane  Doe ")).toBe("Jane"); expect(firstName("Sam")).toBe("Sam"); expect(firstName(" ")).toBe("the creator"); });
  it("escapes emails and links to the relevant page", () => {
    const mail = questionEmail("<script>", "Product", "<img>", "https://doerly.test");
    expect(mail.html).not.toContain("<script>"); expect(mail.html).toContain("&lt;img&gt;"); expect(mail.text).toContain("https://doerly.test/dashboard/questions");
    expect(answerEmail("Product", "my-guide", "Why?", "Because", "https://doerly.test").text).toContain("https://doerly.test/guide/my-guide");
  });
});
