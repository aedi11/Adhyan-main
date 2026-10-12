// Bulk-checks the variant engine over the whole ELL 1000 bank: run `npx tsx scripts/check-variants.ts`.
import { ELL1000_QUESTIONS } from "../src/lib/data/ell1000";
import { generateVariant } from "../src/lib/domain/transform";
import { gradeAnswer } from "../src/lib/domain/grading";
let n = 0, bad = 0, distinctPrompts = 0, sampled = 0;
const fmt: Record<string, number> = {};
const num = (s: string) => Number(/-?\d+(\.\d+)?/.exec(s)?.[0]);
for (const q of ELL1000_QUESTIONS) {
  const prompts = new Set<string>();
  for (let s = 1; s <= 12; s++) {
    const v = generateVariant(q, s * 7919 + q.id.length);
    n++; fmt[v.renderedType] = (fmt[v.renderedType] ?? 0) + 1; prompts.add(v.prompt);
    // the correct answer must grade as correct, and a wrong one as wrong
    if (v.answerKey.optionIds) {
      const ok = gradeAnswer(v, { kind: "options", optionIds: v.answerKey.optionIds });
      const wrong = v.options!.find((o) => !v.answerKey.optionIds!.includes(o.id));
      const no = wrong ? !gradeAnswer(v, { kind: "options", optionIds: [wrong.id] }) : true;
      if (!ok || !no || v.answerKey.optionIds.length !== 1) { bad++; console.log("CHOICE", q.id, v.prompt); }
    } else {
      const ok = gradeAnswer(v, { kind: "value", value: String(v.answerKey.value) });
      if (!ok) { bad++; console.log("VALUE", q.id); }
      const key = Number(v.answerKey.value);
      // 3-decimal entry of the key must pass; a ±1 neighbour must fail
      if (!gradeAnswer(v, { kind: "value", value: key.toFixed(3) })) { bad++; console.log("3DP", q.id, key); }
      if (gradeAnswer(v, { kind: "value", value: String(key + 1) })) { bad++; console.log("LOOSE", q.id, key); }
      if (typeof v.answerKey.value !== "number") { bad++; console.log("NONNUM", q.id, v.answerKey.value); }
      // numeric answer must appear as the final result in the worked solution
      if (v.explanation && q.instances) {
        sampled++;
        const nums = [...v.explanation.replace(/−/g, "-").matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
        const want = Number(v.answerKey.value);
        const tol = 0.011 * Math.abs(want) + 0.011;
        // the answer must appear among the solution's computed values
        if (!nums.some((x) => Math.abs(x - want) <= tol)) {
          bad++; console.log("SOLUTION MISMATCH", q.id, v.prompt, v.answerKey, v.explanation);
        }
      }
    }
  }
  if (prompts.size > 1) distinctPrompts++;
}
console.log({ variants: n, bad, formats: fmt, questionsWithDistinctVariants: distinctPrompts, of: ELL1000_QUESTIONS.length, numericSolutionChecks: sampled });
