/**
 * Server-side grading. The browser never sees the answer key; it submits a
 * raw answer and the server compares against the variant's answerKey.
 */
import type { QuestionVariant } from "./types";

export type SubmittedAnswer =
  | { kind: "options"; optionIds: string[] }
  | { kind: "value"; value: string };

function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Grade a submitted answer against a (server-only) variant. Returns correctness. */
export function gradeAnswer(variant: QuestionVariant, answer: SubmittedAnswer): boolean {
  const key = variant.answerKey;

  // Value-based answers (integer / fill_blank)
  if (key.value !== undefined) {
    if (answer.kind !== "value") return false;
    const given = answer.value;
    if (typeof key.value === "number") {
      const n = parseFloat(given);
      if (Number.isNaN(n)) return false;
      // Exact match…
      if (Math.abs(n - key.value) < 1e-6) return true;
      // …or accept a student's answer rounded to 2 decimals, so repeating
      // decimals (e.g. 166.6667 → "166.67") aren't unfairly marked wrong.
      return Math.round(n * 100) === Math.round(key.value * 100);
    }
    return normalizeText(given) === normalizeText(String(key.value));
  }

  // Choice-based answers (single / multiple / true_false)
  if (key.optionIds) {
    if (answer.kind !== "options") return false;
    const correct = new Set(key.optionIds);
    const given = new Set(answer.optionIds);
    if (correct.size !== given.size) return false;
    for (const id of correct) if (!given.has(id)) return false;
    return true;
  }

  return false;
}
