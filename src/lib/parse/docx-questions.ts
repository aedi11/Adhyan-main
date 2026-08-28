/**
 * Parse plain text (extracted from an uploaded Word .docx) into MCQ questions.
 *
 * This is a PURE function (no I/O) so it can be unit-tested and reused. The
 * .docx → text extraction happens in the server action via `mammoth`.
 *
 * Expected document format (forgiving — extra blank lines are fine):
 *
 *   1. What is 2 + 2?
 *   A) 3
 *   B) 4
 *   C) 5
 *   D) 6
 *   Answer: B
 *
 *   2) Capital of France?
 *   A. Berlin
 *   B. Paris *      ← a trailing/leading "*" also marks the correct option
 *   C. Rome
 *   D. Madrid
 *
 * Rules:
 *   - A line starting with a number + "." or ")" begins a new question.
 *   - Lines starting with a letter (A–H) + "." or ")" are options.
 *   - The correct option is set by an "Answer: X" line OR a "*" marker.
 *   - A question with no marked answer, or fewer than 2 options, is skipped
 *     (and reported in `warnings`) rather than silently shipped wrong.
 */
import type { AuthoredOption, AuthoredQuestion } from "@/lib/domain/types";

export interface ParsedQuestions {
  questions: AuthoredQuestion[];
  warnings: string[];
}

const LETTERS = "abcdefgh";

const Q_RE = /^\s*(?:Q\s*\.?\s*)?(\d{1,3})\s*[.)]\s+(.*\S)\s*$/i;
const OPT_RE = /^\s*\(?([A-Ha-h])\s*[).]\s+(.*\S)\s*$/;
const ANS_RE = /^\s*(?:ans(?:wer)?|correct(?:\s*answer)?)\s*[:.)\-]?\s*([A-Ha-h])\b/i;

interface Draft {
  prompt: string;
  options: { text: string; correct: boolean }[];
  answerLetter?: string;
}

function snippet(prompt: string): string {
  const s = prompt.trim();
  return s.length > 48 ? `${s.slice(0, 48)}…` : s;
}

export function parseQuestionsFromText(text: string): ParsedQuestions {
  const lines = text.split(/\r?\n/);
  const drafts: Draft[] = [];
  let cur: Draft | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // "Answer: B" line (checked before options so it can't be mistaken for one)
    const ans = line.match(ANS_RE);
    if (ans && cur && cur.options.length > 0) {
      cur.answerLetter = ans[1].toLowerCase();
      continue;
    }

    // Option line ("A) ...", "B. ...")
    const opt = line.match(OPT_RE);
    if (opt && cur) {
      let txt = opt[2].trim();
      let correct = false;
      if (/^\*/.test(txt) || /\*\s*$/.test(txt)) {
        correct = true;
        txt = txt.replace(/^\*\s*/, "").replace(/\s*\*$/, "").trim();
      }
      cur.options.push({ text: txt, correct });
      continue;
    }

    // New question line ("1. ...", "2) ...")
    const q = line.match(Q_RE);
    if (q) {
      if (cur) drafts.push(cur);
      cur = { prompt: q[2].trim(), options: [] };
      continue;
    }

    // Otherwise: a continuation of the current prompt (multi-line question),
    // but only before any options have been read.
    if (cur && cur.options.length === 0) {
      cur.prompt = `${cur.prompt} ${line}`.trim();
    }
  }
  if (cur) drafts.push(cur);

  const questions: AuthoredQuestion[] = [];
  const warnings: string[] = [];
  let seq = 0;

  for (const d of drafts) {
    if (d.options.length < 2) {
      warnings.push(`Skipped "${snippet(d.prompt)}" — needs at least 2 options.`);
      continue;
    }

    let options: AuthoredOption[] = d.options.map((o, i) => ({
      id: LETTERS[i] ?? `o${i}`,
      text: o.text,
      correct: o.correct,
    }));

    if (d.answerLetter) {
      const idx = LETTERS.indexOf(d.answerLetter);
      if (idx < 0 || idx >= options.length) {
        warnings.push(`Skipped "${snippet(d.prompt)}" — answer "${d.answerLetter.toUpperCase()}" is out of range.`);
        continue;
      }
      options = options.map((o, i) => ({ ...o, correct: i === idx }));
    } else if (!options.some((o) => o.correct)) {
      warnings.push(`Skipped "${snippet(d.prompt)}" — no correct answer marked (use "Answer: X" or "*").`);
      continue;
    } else {
      // Keep only the first "*"-marked option correct (single-choice).
      let kept = false;
      options = options.map((o) => {
        if (o.correct && !kept) {
          kept = true;
          return o;
        }
        return { ...o, correct: false };
      });
    }

    questions.push({
      id: `uq-${++seq}`,
      levelId: "",
      prompt: d.prompt,
      baseType: "single",
      difficulty: 1,
      options,
      allowedTransforms: ["single"],
    });
  }

  return { questions, warnings };
}
