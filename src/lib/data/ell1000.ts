/**
 * ELL 1000 course bank — the full topic-wise question set used by the app.
 *
 * Two sources are merged:
 *   1. `ell1000-bank.json` — 21 topics × 100 generated questions (answers are
 *      computed, each carries a worked solution). Built by
 *      `python scripts/qbank/export_app.py`; do not edit the JSON by hand.
 *   2. `ell100.ts` — the 66 questions extracted from the real ELL100 Lecture
 *      Quiz-I, several of which carry circuit figures. These are folded into the
 *      matching generated topics so the figures are not lost.
 */
import type { AuthoredQuestion } from "@/lib/domain/types";
import bank from "./ell1000-bank.json";
import { ELL100_QUESTIONS } from "./ell100";
import { ELL100_TOPICS as LEGACY_TOPICS } from "./ell100-topics";

export const ELL1000_COURSE_TITLE = "ELL 1000: Introduction to Electrical Engineering";
export const ELL1000_COURSE_SUBTITLE =
  "Introduction to Electrical Engineering · NPTEL syllabus (Prof. Bhim Singh, IIT Delhi)";

export interface BankTopic {
  id: string;
  title: string;
  blurb: string;
  questionIds: string[];
}

/** Where each legacy (quiz-paper) topic belongs in the 21-topic structure. */
const LEGACY_TO_TOPIC: Record<string, string> = {
  basics: "t1",
  elements: "t1",
  kirchhoff: "t2",
  nodal: "t2",
  theorems: "t3",
  transients: "t4",
  resistive: "t21",
};

// ── Generated questions → AuthoredQuestion ──
const generated: AuthoredQuestion[] = (bank.questions as {
  id: string;
  prompt: string;
  options: { id: string; text: string; correct: boolean }[];
  explanation: string;
}[]).map((q) => ({
  id: q.id,
  levelId: "",
  prompt: q.prompt,
  baseType: "single",
  difficulty: 1,
  allowedTransforms: ["single"],
  options: q.options,
  explanation: q.explanation,
}));

/** Every ELL 1000 question (generated + the original quiz paper). */
export const ELL1000_QUESTIONS: AuthoredQuestion[] = [...generated, ...ELL100_QUESTIONS];

/** Topics with the legacy quiz questions appended to their matching topic. */
export const ELL1000_TOPICS: BankTopic[] = (bank.topics as BankTopic[]).map((t) => {
  const legacyIds = LEGACY_TOPICS.filter((lt) => LEGACY_TO_TOPIC[lt.id] === t.id).flatMap(
    (lt) => lt.questionIds,
  );
  return { ...t, questionIds: [...t.questionIds, ...legacyIds] };
});

/** Fast id → question lookup (built once). */
export const ELL1000_BY_ID = new Map(ELL1000_QUESTIONS.map((q) => [q.id, q]));

export const ELL1000_TOTAL = ELL1000_QUESTIONS.length;
