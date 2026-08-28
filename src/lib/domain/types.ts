/**
 * Core domain types. These are pure data shapes with no I/O so they can be
 * shared between server logic, the demo store, and (later) Supabase.
 */

export type QuestionType =
  | "single" // single correct choice
  | "multiple" // multiple correct choices
  | "integer" // numeric answer
  | "fill_blank" // short text answer
  | "true_false";

export interface VariableSpec {
  name: string; // e.g. "v"
  min: number;
  max: number;
  step?: number; // default 1
}

export interface AuthoredOption {
  id: string;
  text: string; // may contain {var} placeholders
  correct: boolean;
}

/**
 * The teacher-authored question. The canonical answer lives here but in
 * production the sensitive fields live in `question_secrets` (service-role
 * only) — see PROJECT_PLAN.md. The transform engine derives per-student
 * variants from this.
 */
export interface AuthoredQuestion {
  id: string;
  levelId: string;
  prompt: string; // supports {var} placeholders for parameterized questions
  baseType: QuestionType;
  difficulty: 1 | 2 | 3;

  options?: AuthoredOption[]; // for single / multiple / true_false
  answerValue?: string | number; // for integer / fill_blank (canonical)

  variables?: VariableSpec[]; // quantitative parameterization
  answerFormula?: string; // evaluated DETERMINISTICALLY, never by AI

  allowedTransforms: QuestionType[]; // formats this question may render as
  aiParaphrase?: boolean; // theory-question wording variation (teacher-approved)
  explanation?: string;
  media?: string; // optional figure/diagram URL shown with the question
}

export interface VariantOption {
  id: string;
  text: string;
}

/**
 * A concrete per-student rendering of a question. The `answerKey` is the
 * resolved correct answer and is NEVER sent to the browser — grading happens
 * server-side. The client receives `PublicVariant` (answerKey stripped).
 */
export interface QuestionVariant {
  questionId: string;
  seed: number;
  renderedType: QuestionType;
  prompt: string;
  options?: VariantOption[]; // for choice types (order already shuffled)
  media?: string; // optional figure/diagram URL shown with the question
  answerKey: {
    optionIds?: string[]; // correct option id(s)
    value?: string | number; // for integer / fill_blank
  };
  explanation?: string;
}

/** What actually reaches the client — no answer key. */
export type PublicVariant = Omit<QuestionVariant, "answerKey" | "explanation">;

export interface Level {
  id: string;
  topicId: string;
  index: number; // 0-based order
  title: string; // shown to students — always "Level N" (difficulty step only)
  concept?: string; // author-facing note about what it covers; never shown to students
  passThreshold: number; // y%, e.g. 70
  minQuestions: number; // e.g. 5
  timeLimitSec: number; // quiz timer
  questionIds: string[];
}

export interface Topic {
  id: string;
  courseId: string;
  index: number;
  title: string;
  unlockLevelIndex: number; // m: pass this level index to unlock next topic
  levels: Level[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  pricePerMonth: number; // per-course subscription (INR)
  trialDays: number;
  topics: Topic[];
}

export type LevelStatus = "locked" | "unlocked" | "in_progress" | "passed";

export interface LevelProgress {
  levelId: string;
  status: LevelStatus;
  bestCorrect: number; // best correct count across attempts (per-question best)
  attempted: number;
  percent: number; // bestCorrect / total * 100
}

export interface AttemptResult {
  questionId: string;
  correct: boolean;
  timeSpentSec: number;
}

export interface Gamification {
  xp: number;
  streakDays: number;
  badges: string[];
}
