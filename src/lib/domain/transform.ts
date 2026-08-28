/**
 * Question transformation engine.
 *
 * Turns one AuthoredQuestion into a deterministic per-student variant so no two
 * students see identical questions. Determinism (seeded RNG) means the same
 * student+attempt always gets the same variant — refresh-safe and cacheable.
 *
 * Three transformation paths (see PROJECT_PLAN.md §4.3):
 *   A) Parameterized templates  -> randomize {vars}, compute answer via safeEval
 *   B) Format transformation    -> render as single/multiple/integer/fill/TF
 *   C) Surface variation        -> shuffle options (AI paraphrase handled at
 *                                  publish time, not here, so grading stays pure)
 */
import type {
  AuthoredQuestion,
  PublicVariant,
  QuestionVariant,
  VariableSpec,
} from "./types";
import { safeEval } from "./safe-eval";

/** Deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable string -> int hash so a (studentId, questionId, attempt) maps to a seed. */
export function hashSeed(...parts: (string | number)[]): number {
  const str = parts.join("|");
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickVarValue(spec: VariableSpec, rand: () => number): number {
  const step = spec.step ?? 1;
  const steps = Math.floor((spec.max - spec.min) / step);
  return spec.min + Math.floor(rand() * (steps + 1)) * step;
}

function fillPlaceholders(text: string, vars: Record<string, number>): string {
  return text.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Options that reference other options by position ("Both (a) and (b)",
 * "None of the above", …) must NOT be reordered — shuffling them makes the
 * option nonsensical. Detect that case so we can keep the authored order.
 */
const POSITIONAL_OPTION =
  /\b(all of the above|none of the above|both of the above|both \(?[a-d]\)?\s*(and|&)\s*\(?[a-d]\)?|\(?[a-d]\)?\s+and\s+\(?[a-d]\)?)\b/i;

function hasPositionalOptions(texts: { text: string }[]): boolean {
  return texts.some((o) => POSITIONAL_OPTION.test(o.text));
}

/** Build numeric distractors around a correct value using deterministic rules. */
function numericDistractors(correct: number, rand: () => number): number[] {
  const candidates = new Set<number>();
  const deltas = [1, -1, 2, -2, Math.round(correct * 0.1) || 3];
  for (const d of deltas) {
    if (candidates.size >= 6) break;
    const v = correct + d;
    if (v !== correct) candidates.add(v);
  }
  return shuffle([...candidates], rand).slice(0, 3);
}

/**
 * Generate a deterministic variant. `renderAs` lets the engine choose a format
 * from the question's allowedTransforms; if omitted it picks one by seed.
 */
export function generateVariant(q: AuthoredQuestion, seed: number): QuestionVariant {
  const rand = rng(seed);

  // --- Resolve parameterized variables (path A) ---
  const vars: Record<string, number> = {};
  if (q.variables?.length) {
    for (const spec of q.variables) vars[spec.name] = pickVarValue(spec, rand);
  }

  // --- Determine the canonical correct value/options ---
  let canonicalValue: string | number | undefined = q.answerValue;
  if (q.answerFormula) {
    canonicalValue = Math.round(safeEval(q.answerFormula, vars) * 1e6) / 1e6;
  }

  const prompt = fillPlaceholders(q.prompt, vars);

  // --- Choose the rendered format (path B) ---
  const allowed = q.allowedTransforms.length ? q.allowedTransforms : [q.baseType];
  const renderedType = allowed[Math.floor(rand() * allowed.length)];

  // Numeric / fill rendering
  if (renderedType === "integer" || renderedType === "fill_blank") {
    const value =
      canonicalValue ??
      (q.options?.find((o) => o.correct)?.text ?? "");
    return {
      questionId: q.id,
      seed,
      renderedType,
      prompt,
      media: q.media,
      answerKey: { value },
      explanation: q.explanation,
    };
  }

  // Choice rendering (single / multiple / true_false)
  let optionTexts: { text: string; correct: boolean }[];

  if (q.options?.length) {
    optionTexts = q.options.map((o) => ({
      text: fillPlaceholders(o.text, vars),
      correct: o.correct,
    }));
  } else if (canonicalValue !== undefined) {
    // Build choice options from a numeric canonical answer + distractors.
    const correctNum = Number(canonicalValue);
    const distractors = numericDistractors(correctNum, rand);
    optionTexts = [
      { text: String(canonicalValue), correct: true },
      ...distractors.map((d) => ({ text: String(d), correct: false })),
    ];
  } else {
    optionTexts = [];
  }

  // For single-choice rendering, keep exactly one correct option.
  if (renderedType === "single" && optionTexts.filter((o) => o.correct).length > 1) {
    let kept = false;
    optionTexts = optionTexts.map((o) => {
      if (o.correct && !kept) {
        kept = true;
        return o;
      }
      return { ...o, correct: false };
    });
  }

  // Keep authored order when options are position-referential; otherwise shuffle.
  const ordered = hasPositionalOptions(optionTexts)
    ? optionTexts
    : shuffle(optionTexts, rand);
  const shuffled = ordered.map((o, i) => ({
    id: `o${i}`,
    text: o.text,
    correct: o.correct,
  }));

  return {
    questionId: q.id,
    seed,
    renderedType,
    prompt,
    media: q.media,
    options: shuffled.map(({ id, text }) => ({ id, text })),
    answerKey: { optionIds: shuffled.filter((o) => o.correct).map((o) => o.id) },
    explanation: q.explanation,
  };
}

/** Strip the answer key so the variant is safe to send to the browser. */
export function toPublicVariant(v: QuestionVariant): PublicVariant {
  return {
    questionId: v.questionId,
    seed: v.seed,
    renderedType: v.renderedType,
    prompt: v.prompt,
    media: v.media,
    options: v.options,
  };
}
