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
      const n = parseFloat(given.replace(/,/g, ""));
      if (Number.isNaN(n)) return false;
      // Precision-based match: the answer must agree with the key to the
      // key's own decimal places (±half a unit in the last place). So 194
      // accepts 194 but not 195, and 16.67 accepts 16.67 or 16.667. A
      // percentage tolerance is unsafe: some distractors are only ±1 apart.
      const decimals = (String(key.value).split(".")[1] ?? "").length;
      const tol = 0.5 * 10 ** -decimals;
      return Math.abs(n - key.value) <= tol + 1e-9;
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
