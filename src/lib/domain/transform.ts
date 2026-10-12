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
  QuestionType,
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

/** "12.5 Ω" → { value: 12.5, unit: "Ω" }; null when the text isn't a plain number. */
export function parseNumeric(text: string): { value: number; unit: string } | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*(.*?)\s*$/.exec(text);
  if (!m) return null;
  return { value: Number(m[1]), unit: m[2] };
}

/**
 * Formats a choice question can be faithfully rendered in, derived from its
 * options (never guessed by AI):
 *   - single      always
 *   - true_false  always (the statement pairs the stem with one option)
 *   - integer     only when every option is a number in the same unit, so the
 *                 answer can be typed in and graded numerically (never for
 *                 number-system conversions)
 */
const NUMBER_SYSTEM = /hexadecimal|binary|octal|BCD|gray code/i;

export function choiceTransforms(options: { text: string }[], prompt = ""): QuestionType[] {
  const out: QuestionType[] = ["single", "true_false"];
  // Base-n conversions (e.g. hex "C06") can't be typed into a decimal box.
  if (options.length >= 2 && !hasPositionalOptions(options) && !NUMBER_SYSTEM.test(prompt)) {
    const parsed = options.map((o) => parseNumeric(o.text));
    if (parsed.every(Boolean) && new Set(parsed.map((p) => p!.unit)).size === 1) {
      out.push("integer");
    }
  }
  return out;
}

/** Pick the rendered format: single-choice half the time, the rest spread evenly. */
function pickFormat(allowed: QuestionType[], rand: () => number): QuestionType {
  if (allowed.length === 1) return allowed[0];
  const others = allowed.filter((t) => t !== "single");
  if (allowed.includes("single") && rand() < 0.5) return "single";
  return others[Math.floor(rand() * others.length)] ?? allowed[0];
}

/** Turn a stem + candidate answer into a statement to judge as true or false. */
function toStatement(prompt: string, answer: string): string {
  const stem = prompt.trim();
  if (/[:\-–—]$/.test(stem)) return `${stem.replace(/[:\-–—]$/, "").trimEnd()}: ${answer}.`;
  return `${stem}\nProposed answer: ${answer}`;
}

/**
 * Generate a deterministic variant: (1) pick a value set — the base question or
 * one of its pre-computed instances, each with its own correct answer and
 * solution; (2) pick a format the question supports; (3) shuffle options.
 */
export function generateVariant(q: AuthoredQuestion, seed: number): QuestionVariant {
  const rand = rng(seed);

  // --- Path A1: pick a pre-computed value set (numerical bank questions) ---
  let basePrompt = q.prompt;
  let baseOptions = q.options;
  let explanation = q.explanation;
  if (q.instances?.length) {
    const k = Math.floor(rand() * (q.instances.length + 1));
    if (k > 0) {
      const inst = q.instances[k - 1];
      basePrompt = inst.prompt;
      baseOptions = inst.options;
      explanation = inst.explanation ?? explanation;
    }
  }

  // --- Path A2: resolve parameterized variables (authored templates) ---
  const vars: Record<string, number> = {};
  if (q.variables?.length) {
    for (const spec of q.variables) vars[spec.name] = pickVarValue(spec, rand);
  }

  let canonicalValue: string | number | undefined = q.answerValue;
  if (q.answerFormula) {
    canonicalValue = Math.round(safeEval(q.answerFormula, vars) * 1e6) / 1e6;
  }

  const prompt = fillPlaceholders(basePrompt, vars);
  if (explanation) explanation = fillPlaceholders(explanation, vars);

  // --- Path B: choose the rendered format ---
  const allowed = q.allowedTransforms.length ? q.allowedTransforms : [q.baseType];
  let renderedType = pickFormat(allowed, rand);

  let optionTexts: { text: string; correct: boolean }[] = baseOptions?.length
    ? baseOptions.map((o) => ({ text: fillPlaceholders(o.text, vars), correct: o.correct }))
    : [];

  // A re-computed instance must still support the chosen format.
  if (renderedType === "integer" && baseOptions?.length && !choiceTransforms(optionTexts, prompt).includes("integer")) {
    renderedType = "single";
  }

  // Numeric / short-answer rendering
  if (renderedType === "integer" || renderedType === "fill_blank") {
    const correctText = optionTexts.find((o) => o.correct)?.text;
    const parsed = correctText ? parseNumeric(correctText) : null;
    if (parsed) {
      const unit = parsed.unit || undefined;
      return {
        questionId: q.id,
        seed,
        renderedType: "integer",
        prompt,
        media: q.media,
        unit,
        answerKey: { value: parsed.value, unit },
        explanation,
      };
    }
    return {
      questionId: q.id,
      seed,
      renderedType,
      prompt,
      media: q.media,
      answerKey: { value: canonicalValue ?? correctText ?? "" },
      explanation,
    };
  }

  if (!optionTexts.length && canonicalValue !== undefined) {
    // Build choice options from a numeric canonical answer + distractors.
    const correctNum = Number(canonicalValue);
    optionTexts = [
      { text: String(canonicalValue), correct: true },
      ...numericDistractors(correctNum, rand).map((d) => ({ text: String(d), correct: false })),
    ];
  }

  // True / false: pair the stem with the right answer or one distractor.
  if (renderedType === "true_false" && optionTexts.length >= 2) {
    const correct = optionTexts.filter((o) => o.correct);
    const wrong = optionTexts.filter((o) => !o.correct);
    const showCorrect = !wrong.length || rand() < 0.5;
    const pool = showCorrect ? correct : wrong;
    const shown = pool[Math.floor(rand() * pool.length)];
    const truth = correct.map((o) => o.text).join(", ");
    return {
      questionId: q.id,
      seed,
      renderedType,
      prompt: toStatement(prompt, shown.text),
      media: q.media,
      options: [
        { id: "true", text: "True" },
        { id: "false", text: "False" },
      ],
      answerKey: { optionIds: [showCorrect ? "true" : "false"] },
      explanation: showCorrect
        ? explanation
        : `The correct answer is ${truth}, not ${shown.text}.${explanation ? ` ${explanation}` : ""}`,
    };
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
    explanation,
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
    unit: v.unit,
  };
}
