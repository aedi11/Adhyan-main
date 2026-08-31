/**
 * Demo data store (server-only, in-memory).
 *
 * Runs the whole app without Supabase using the SAME pure domain logic
 * (transform/grade/progression) the production repository will use, so swapping
 * the backend later changes only this file.
 *
 * Anti-theft property preserved: generated variants (with answer keys) live
 * ONLY here on the server; the client receives public variants and grading is
 * server-side.
 */
import "server-only";
import type {
  AttemptResult,
  Course,
  Gamification,
  Level,
  LevelProgress,
  PublicVariant,
  QuestionVariant,
} from "@/lib/domain/types";
import type { AuthoredQuestion } from "@/lib/domain/types";
import { DEMO_COURSES, DEMO_QUESTIONS } from "./seed";
import {
  ELL1000_BY_ID,
  ELL1000_COURSE_SUBTITLE,
  ELL1000_COURSE_TITLE,
  ELL1000_QUESTIONS,
  ELL1000_TOPICS,
} from "./ell1000";
import { ELL100_TEST_COUNT, TEST_QUESTION_COUNT } from "./ell100-topics";
import { generateVariant, hashSeed, toPublicVariant } from "@/lib/domain/transform";
import { gradeAnswer, type SubmittedAnswer } from "@/lib/domain/grading";
import {
  applyAttempt,
  computeCourseStatuses,
  courseCompletion,
  xpForAttempt,
} from "@/lib/domain/progression";
import { QUESTIONS_PER_TEST, TEST_DURATION_SEC } from "@/lib/config";

type AttemptKind = "level" | "placement" | "test";

interface ActiveAttempt {
  id: string;
  kind: AttemptKind;
  levelId?: string; // for level attempts
  courseId?: string; // for placement attempts
  testId?: string; // for test attempts
  title?: string; // display title (e.g. "Test 1")
  startedAt: number;
  deadline: number; // epoch ms (server-authoritative)
  durationSec: number;
  variants: QuestionVariant[]; // server-only (answer keys)
  submitted?: boolean;
  outcome?: SubmitOutcome; // cached so re-grading is idempotent
}

interface TestResult {
  attempts: number;
  bestPercent: number;
  lastPercent: number;
  bestCorrect: number;
  total: number;
}

const g = globalThis as unknown as {
  __adhyan?: {
    progress: Record<string, LevelProgress>;
    game: Gamification;
    attempts: Map<string, ActiveAttempt>;
    history: { date: string; xp: number; correct: number }[];
    enrolled: Set<string>; // course ids the student "purchased"
    placed: Set<string>; // course ids where the placement test is done
    uploaded: AuthoredQuestion[]; // test-mode question bank (upload order)
    testResults: Record<string, TestResult>; // keyed by test id
  };
};

function freshDb(): NonNullable<typeof g.__adhyan> {
  return {
    progress: {},
    game: { xp: 0, streakDays: 1, badges: [] },
    attempts: new Map(),
    history: [],
    enrolled: new Set(),
    placed: new Set(),
    uploaded: [], // extra questions uploaded into the ELL 1000 bank
    testResults: {},
  };
}

function db() {
  if (!g.__adhyan) g.__adhyan = freshDb();
  return g.__adhyan;
}

/** Look up an authored question across all banks (ELL 1000, demo seed, uploads). */
function getQuestion(qid: string): AuthoredQuestion | undefined {
  return (
    ELL1000_BY_ID.get(qid) ??
    DEMO_QUESTIONS[qid] ??
    db().uploaded.find((q) => q.id === qid)
  );
}

// ───────────────────────── Catalog & lookups ─────────────────────────
export function getCourses(): Course[] {
  return DEMO_COURSES;
}

export function getCourse(courseId?: string): Course {
  if (!courseId) return DEMO_COURSES[0];
  return DEMO_COURSES.find((c) => c.id === courseId) ?? DEMO_COURSES[0];
}

function flattenLevels(course: Course): Level[] {
  return course.topics.flatMap((t) => t.levels);
}

function findLevel(levelId: string) {
  for (const course of DEMO_COURSES) {
    for (const topic of course.topics) {
      const lvl = topic.levels.find((l) => l.id === levelId);
      if (lvl) return { course, topic, level: lvl };
    }
  }
  return null;
}

// ───────────────────────── Enrollment ─────────────────────────
export function isEnrolled(courseId: string): boolean {
  return db().enrolled.has(courseId);
}

export function isPlaced(courseId: string): boolean {
  return db().placed.has(courseId);
}

export function enroll(courseId: string): void {
  db().enrolled.add(courseId);
}

/** The student's primary course (first enrolled), used by the dashboard. */
export function getActiveCourseId(): string | null {
  return db().enrolled.values().next().value ?? null;
}

// ───────────────────────── Progress views ─────────────────────────
export function getStatuses(courseId?: string): Record<string, LevelProgress> {
  return computeCourseStatuses(getCourse(courseId), db().progress);
}

export function getGamification(): Gamification {
  return db().game;
}

export function getCompletion(courseId?: string): number {
  const course = getCourse(courseId);
  return courseCompletion(course, getStatuses(course.id));
}

export function getHistory() {
  return db().history;
}

// ───────────────────────── Attempts ─────────────────────────
export interface StartedAttempt {
  attemptId: string;
  levelTitle: string;
  durationSec: number;
  deadline: number;
  variants: PublicVariant[];
}

function makeAttempt(
  kind: AttemptKind,
  variants: QuestionVariant[],
  durationSec: number,
  extra: Partial<ActiveAttempt>,
): ActiveAttempt {
  const now = Date.now();
  const attempt: ActiveAttempt = {
    id: `att-${now}-${Math.floor(Math.random() * 1e6)}`,
    kind,
    startedAt: now,
    deadline: now + durationSec * 1000,
    durationSec,
    variants,
    ...extra,
  };
  db().attempts.set(attempt.id, attempt);
  return attempt;
}

/** Begin a timed level attempt: generate per-student variants, store server-side. */
export function startAttempt(levelId: string): StartedAttempt {
  const found = findLevel(levelId);
  if (!found) throw new Error("Level not found");
  const { level } = found;

  if (getStatuses(found.course.id)[levelId]?.status === "locked") {
    throw new Error("Level is locked");
  }

  const attemptId = `att-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const variants = level.questionIds.map((qid) =>
    generateVariant(DEMO_QUESTIONS[qid], hashSeed(attemptId, qid)),
  );
  const now = Date.now();
  const attempt: ActiveAttempt = {
    id: attemptId,
    kind: "level",
    levelId,
    startedAt: now,
    deadline: now + level.timeLimitSec * 1000,
    durationSec: level.timeLimitSec,
    variants,
  };
  db().attempts.set(attemptId, attempt);

  return {
    attemptId,
    levelTitle: level.title,
    durationSec: level.timeLimitSec,
    deadline: attempt.deadline,
    variants: variants.map(toPublicVariant),
  };
}

const PLACEMENT_COUNT = 10;
const PLACEMENT_SECONDS = 600; // 10 minutes

/** Pick ~10 questions spanning every level so we can gauge the student's level. */
function placementQuestionIds(course: Course): string[] {
  const flat = flattenLevels(course);
  const picks: string[] = [];
  for (let round = 0; round < 12 && picks.length < PLACEMENT_COUNT; round++) {
    for (const lvl of flat) {
      const qid = lvl.questionIds[round];
      if (qid) {
        picks.push(qid);
        if (picks.length >= PLACEMENT_COUNT) break;
      }
    }
  }
  return picks;
}

/** Begin the diagnostic placement test for a course (must be enrolled). */
export function startPlacement(courseId: string): StartedAttempt {
  const course = getCourse(courseId);
  if (!isEnrolled(courseId)) throw new Error("Enroll before taking the placement test");

  const ids = placementQuestionIds(course);
  const attempt = makeAttempt(
    "placement",
    [],
    PLACEMENT_SECONDS,
    { courseId },
  );
  attempt.variants = ids.map((qid) =>
    generateVariant(DEMO_QUESTIONS[qid], hashSeed(attempt.id, qid)),
  );

  return {
    attemptId: attempt.id,
    levelTitle: "Placement Test",
    durationSec: PLACEMENT_SECONDS,
    deadline: attempt.deadline,
    variants: attempt.variants.map(toPublicVariant),
  };
}

export interface AttemptView {
  attemptId: string;
  levelTitle: string;
  deadline: number;
  remainingSec: number;
  variants: PublicVariant[];
}

export function getAttemptView(attemptId: string): AttemptView | null {
  const a = db().attempts.get(attemptId);
  if (!a) return null;
  const title =
    a.title ??
    (a.kind === "placement" ? "Placement Test" : findLevel(a.levelId!)?.level.title ?? "Quiz");
  return {
    attemptId,
    levelTitle: title,
    deadline: a.deadline,
    remainingSec: Math.max(0, Math.round((a.deadline - Date.now()) / 1000)),
    variants: a.variants.map(toPublicVariant),
  };
}

// ───────────────────────── Grading & submission ─────────────────────────
export interface GradedResult {
  questionId: string;
  correct: boolean;
  yourAnswer: string;
  correctAnswer: string;
  explanation?: string;
}

export interface PlacementOutcome {
  courseId: string;
  placedCount: number; // levels placed out of
  startLevelIndex: number; // 0-based level to start at (flattened across topics)
  startLevelTitle: string; // "Level N"
  startTopicTitle: string; // topic the start level belongs to
}

export interface SubmitOutcome {
  kind: AttemptKind;
  correctCount: number;
  total: number;
  percent: number;
  passed: boolean;
  xpEarned: number;
  newlyUnlockedLevelIds: string[];
  results: GradedResult[];
  placement?: PlacementOutcome;
}

function answerKeyToText(v: QuestionVariant): string {
  if (v.answerKey.value !== undefined) return String(v.answerKey.value);
  return (v.answerKey.optionIds ?? [])
    .map((id) => v.options?.find((o) => o.id === id)?.text ?? id)
    .join(", ");
}

function submittedToText(v: QuestionVariant, ans: SubmittedAnswer): string {
  if (ans.kind === "value") return ans.value || "—";
  return (
    ans.optionIds.map((id) => v.options?.find((o) => o.id === id)?.text ?? id).join(", ") || "—"
  );
}

function gradeVariants(
  variants: QuestionVariant[],
  answers: Record<string, SubmittedAnswer>,
  expired: boolean,
) {
  const results: GradedResult[] = [];
  const attemptResults: AttemptResult[] = [];
  for (const v of variants) {
    const submitted = answers[v.questionId];
    const correct = !expired && submitted ? gradeAnswer(v, submitted) : false;
    results.push({
      questionId: v.questionId,
      correct,
      yourAnswer: submitted ? submittedToText(v, submitted) : "—",
      correctAnswer: answerKeyToText(v),
      explanation: v.explanation,
    });
    attemptResults.push({ questionId: v.questionId, correct, timeSpentSec: 0 });
  }
  return { results, attemptResults };
}

/** Map placement score (out of PLACEMENT_COUNT) to how many levels to skip. */
function scoreToPlaced(correct: number, maxLevels: number): number {
  const p = correct <= 3 ? 0 : correct <= 5 ? 1 : correct <= 7 ? 2 : correct <= 9 ? 3 : 4;
  return Math.min(p, Math.max(0, maxLevels - 1));
}

export function submitAttempt(
  attemptId: string,
  answers: Record<string, SubmittedAnswer>,
): SubmitOutcome {
  const a = db().attempts.get(attemptId);
  if (!a) throw new Error("Attempt not found or expired");
  // Idempotent: a Server Action revalidates the current route, re-running the
  // quiz page. Return the cached outcome instead of double-grading / double-XP.
  if (a.submitted && a.outcome) return a.outcome;

  const expired = Date.now() > a.deadline + 2000;
  const { results, attemptResults } = gradeVariants(a.variants, answers, expired);
  const correctCount = attemptResults.filter((r) => r.correct).length;

  const outcome =
    a.kind === "placement"
      ? finishPlacement(a, results, correctCount)
      : a.kind === "test"
        ? finishTest(a, results, correctCount)
        : finishLevel(a, results, attemptResults, correctCount);

  a.submitted = true;
  a.outcome = outcome;
  recordHistory(correctCount, outcome.xpEarned);
  return outcome;
}

function finishLevel(
  a: ActiveAttempt,
  results: GradedResult[],
  attemptResults: AttemptResult[],
  correctCount: number,
): SubmitOutcome {
  const found = findLevel(a.levelId!);
  if (!found) throw new Error("Level not found");
  const { course, level } = found;

  const statusesBefore = getStatuses(course.id);
  const prior = db().progress[level.id];
  const updated = applyAttempt(level, prior, attemptResults);
  db().progress[level.id] = updated;
  const statusesAfter = getStatuses(course.id);

  const justPassed = prior?.status !== "passed" && updated.status === "passed";
  const newlyUnlockedLevelIds = Object.keys(statusesAfter).filter(
    (id) => statusesBefore[id]?.status === "locked" && statusesAfter[id].status !== "locked",
  );

  const xpEarned = xpForAttempt(attemptResults, justPassed);
  db().game.xp += xpEarned;
  awardBadges(correctCount, a.variants.length, justPassed, level.title);

  return {
    kind: "level",
    correctCount,
    total: a.variants.length,
    percent: a.variants.length ? Math.round((correctCount / a.variants.length) * 100) : 0,
    passed: updated.status === "passed",
    xpEarned,
    newlyUnlockedLevelIds,
    results,
  };
}

function finishPlacement(
  a: ActiveAttempt,
  results: GradedResult[],
  correctCount: number,
): SubmitOutcome {
  const course = getCourse(a.courseId!);
  const flat = flattenLevels(course);
  const placedCount = scoreToPlaced(correctCount, flat.length);

  // Mark placed-out levels as passed so the student starts beyond them.
  for (let i = 0; i < placedCount; i++) {
    const lvl = flat[i];
    const total = lvl.questionIds.length;
    db().progress[lvl.id] = {
      levelId: lvl.id,
      status: "passed",
      bestCorrect: total,
      attempted: 1,
      percent: 100,
    };
  }
  db().placed.add(course.id);

  const startLevel = flat[Math.min(placedCount, flat.length - 1)];
  const startTopic = course.topics.find((t) =>
    t.levels.some((l) => l.id === startLevel.id),
  );
  const xpEarned = correctCount * 10;
  db().game.xp += xpEarned;

  return {
    kind: "placement",
    correctCount,
    total: a.variants.length,
    percent: a.variants.length ? Math.round((correctCount / a.variants.length) * 100) : 0,
    passed: true,
    xpEarned,
    newlyUnlockedLevelIds: [],
    results,
    placement: {
      courseId: course.id,
      placedCount,
      startLevelIndex: placedCount,
      startLevelTitle: startLevel.title,
      startTopicTitle: startTopic?.title ?? "",
    },
  };
}

function awardBadges(correct: number, total: number, justPassed: boolean, levelTitle: string) {
  const badges = new Set(db().game.badges);
  if (correct === total) badges.add("Perfect Level");
  if (justPassed) badges.add(`Cleared ${levelTitle}`);
  if (db().game.xp >= 200) badges.add("200 XP Club");
  db().game.badges = [...badges];
}

function recordHistory(correctCount: number, xpEarned: number) {
  const today = new Date().toISOString().slice(0, 10);
  const entry = db().history.find((h) => h.date === today);
  if (entry) {
    entry.xp += xpEarned;
    entry.correct += correctCount;
  } else {
    db().history.push({ date: today, xp: xpEarned, correct: correctCount });
  }
}

// ───────────────────────── Tests (per course) ─────────────────────────
export interface TestMeta {
  id: string; // `${courseId}#${index+1}`
  courseId: string;
  index: number;
  title: string; // "Test N"
  questionCount: number;
  durationSec: number;
}

export interface CatalogCourse {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  subject: string;
  questionCount: number;
  testCount: number;
}

/** Course id (also the URL slug) for the Introduction to Electrical Engineering course. */
export const ELL100_ID = "intro-electrical-engineering";

/** Append parsed questions to the ELL 1000 bank; returns its new total size. */
export function addUploadedQuestions(qs: AuthoredQuestion[]): number {
  const base = ELL1000_QUESTIONS.length + db().uploaded.length;
  qs.forEach((q, i) => db().uploaded.push({ ...q, id: `uq-${base + i + 1}` }));
  return ELL1000_QUESTIONS.length + db().uploaded.length;
}

/** Remove uploaded extras (the built-in ELL 1000 questions always remain). */
export function clearUploadedQuestions(): void {
  db().uploaded = [];
  db().testResults = {};
}

/** Total questions in the ELL 1000 bank (built-in + uploaded extras). */
export function getUploadedCount(): number {
  return ELL1000_QUESTIONS.length + db().uploaded.length;
}

export function getBankTitle(): string {
  return ELL1000_COURSE_TITLE;
}
export function getBankSubtitle(): string {
  return ELL1000_COURSE_SUBTITLE;
}

/** Flat question-id list for a course — the bank that gets split into tests. */
function courseQuestionIds(courseId: string): string[] {
  if (courseId === ELL100_ID) {
    return [...ELL1000_QUESTIONS.map((q) => q.id), ...db().uploaded.map((q) => q.id)];
  }
  const course = DEMO_COURSES.find((c) => c.id === courseId);
  if (!course) return [];
  return course.topics.flatMap((t) => t.levels.flatMap((l) => l.questionIds));
}

/** Student catalog: ELL 1000 + the demo courses, with question/test counts. */
export function getCatalog(): CatalogCourse[] {
  const base = [
    {
      id: ELL100_ID,
      title: ELL1000_COURSE_TITLE,
      subtitle: ELL1000_COURSE_SUBTITLE,
      description:
        "Concept and numerical MCQs across the full syllabus — circuit elements, circuit laws, network theorems, transients, AC circuits, electronics and machines.",
      subject: "Electrical Engineering",
    },
    ...DEMO_COURSES.map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subject,
      description: c.description,
      subject: c.subject,
    })),
  ];
  return base.map((c) => {
    const n = courseQuestionIds(c.id).length;
    const testCount =
      c.id === ELL100_ID ? ELL100_TEST_COUNT : Math.max(1, Math.ceil(n / QUESTIONS_PER_TEST));
    return { ...c, questionCount: n, testCount };
  });
}

export function getCatalogCourse(courseId: string): CatalogCourse | undefined {
  return getCatalog().find((c) => c.id === courseId);
}

// ── Teacher: topic-wise view of a course ──
export interface TopicQuestion {
  id: string;
  prompt: string;
  correctAnswer: string;
  media?: string;
}
export interface CourseTopicView {
  id: string;
  title: string;
  blurb: string;
  questions: TopicQuestion[];
}

function authoredCorrectText(q: AuthoredQuestion): string {
  if (q.options?.length) return q.options.filter((o) => o.correct).map((o) => o.text).join(", ");
  if (q.answerValue !== undefined) return String(q.answerValue);
  return "computed per variant";
}

/** Questions grouped by topic (ELL 1000) or by topic→levels (demo courses). */
export function getCourseTopics(courseId: string): CourseTopicView[] {
  if (courseId === ELL100_ID) {
    return ELL1000_TOPICS.map((t) => ({
      id: t.id,
      title: t.title,
      blurb: t.blurb,
      questions: t.questionIds
        .map((qid) => getQuestion(qid))
        .filter((q): q is AuthoredQuestion => !!q)
        .map((q) => ({
          id: q.id,
          prompt: q.prompt,
          correctAnswer: authoredCorrectText(q),
          media: q.media,
        })),
    }));
  }
  const course = DEMO_COURSES.find((c) => c.id === courseId);
  if (!course) return [];
  return course.topics.map((t) => ({
    id: t.id,
    title: t.title,
    blurb: `${t.levels.length} levels`,
    questions: t.levels
      .flatMap((l) => l.questionIds)
      .map((qid) => getQuestion(qid))
      .filter((q): q is AuthoredQuestion => !!q)
      .map((q) => ({ id: q.id, prompt: q.prompt, correctAnswer: authoredCorrectText(q), media: q.media })),
  }));
}

export interface TopicSummary {
  id: string;
  title: string;
  blurb: string;
  count: number;
}

/** Lightweight topic list (no question bodies) for the teacher's course page. */
export function getCourseTopicSummaries(courseId: string): TopicSummary[] {
  if (courseId === ELL100_ID) {
    return ELL1000_TOPICS.map((t) => ({
      id: t.id,
      title: t.title,
      blurb: t.blurb,
      count: t.questionIds.length,
    }));
  }
  const course = DEMO_COURSES.find((c) => c.id === courseId);
  if (!course) return [];
  return course.topics.map((t) => ({
    id: t.id,
    title: t.title,
    blurb: `${t.levels.length} levels`,
    count: t.levels.reduce((a, l) => a + l.questionIds.length, 0),
  }));
}

/** One topic with its questions (teacher drill-down page). */
export function getCourseTopic(courseId: string, topicId: string): CourseTopicView | undefined {
  return getCourseTopics(courseId).find((t) => t.id === topicId);
}

/** A course's tests. ELL 1000 uses topic-balanced tests; demo courses chunk by 100. */
export function getTestsForCourse(courseId: string): TestMeta[] {
  if (courseId === ELL100_ID) {
    return Array.from({ length: ELL100_TEST_COUNT }, (_, i) => ({
      id: `${courseId}#${i + 1}`,
      courseId,
      index: i,
      title: `Test ${i + 1}`,
      questionCount: TEST_QUESTION_COUNT,
      durationSec: TEST_DURATION_SEC,
    }));
  }
  const ids = courseQuestionIds(courseId);
  const count = Math.max(1, Math.ceil(ids.length / QUESTIONS_PER_TEST));
  return Array.from({ length: count }, (_, i) => ({
    id: `${courseId}#${i + 1}`,
    courseId,
    index: i,
    title: `Test ${i + 1}`,
    questionCount: ids.slice(i * QUESTIONS_PER_TEST, (i + 1) * QUESTIONS_PER_TEST).length,
    durationSec: TEST_DURATION_SEC,
  }));
}

/** Deterministic shuffle used for per-student topic sampling. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Human-readable spread of questions per topic, e.g. "4" or "4–5". */
export function perTopicLabel(): string {
  const n = ELL1000_TOPICS.length;
  const base = Math.floor(TEST_QUESTION_COUNT / n);
  const extra = TEST_QUESTION_COUNT - base * n;
  return extra === 0 ? `${base}` : `${base}–${base + 1}`;
}

/** How many questions each topic contributes to a given test (sums to 100). */
export function topicQuota(testIndex: number): number[] {
  const n = ELL1000_TOPICS.length;
  const base = Math.floor(TEST_QUESTION_COUNT / n);
  const extra = TEST_QUESTION_COUNT - base * n;
  return ELL1000_TOPICS.map((_, i) => {
    // Rotate which topics get the extra question so it evens out across tests.
    const slot = (i - testIndex) % n;
    const rotated = slot < 0 ? slot + n : slot;
    return base + (rotated < extra ? 1 : 0);
  });
}

/**
 * Topic-balanced per-student question set for one test: every topic contributes
 * its quota (never zero), seeded per attempt so two students get different
 * questions while the whole syllabus stays covered. Total = TEST_QUESTION_COUNT.
 */
function selectEll100Questions(attemptId: string, testIndex: number): string[] {
  const quota = topicQuota(testIndex);
  const picks: string[] = [];
  ELL1000_TOPICS.forEach((t, i) => {
    const shuffled = seededShuffle(t.questionIds, hashSeed(attemptId, t.id, testIndex));
    picks.push(...shuffled.slice(0, quota[i]));
  });
  return picks;
}

export function getTestResults(): Record<string, TestResult> {
  return db().testResults;
}

/** Begin a timed test (testId = `${courseId}#${index+1}`). */
export function startTest(testId: string): StartedAttempt {
  const [courseId, nStr] = testId.split("#");
  const index = Number.parseInt(nStr, 10) - 1;
  if (!courseId || Number.isNaN(index) || index < 0) throw new Error("Test not found");

  const title = `Test ${index + 1}`;
  const attemptId = `att-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  // ELL 1000: topic-balanced per-student draw (every topic covered, different
  // per attempt). Demo courses: the fixed 100-question slice.
  const qids =
    courseId === ELL100_ID
      ? selectEll100Questions(attemptId, index)
      : courseQuestionIds(courseId).slice(
          index * QUESTIONS_PER_TEST,
          (index + 1) * QUESTIONS_PER_TEST,
        );
  if (!qids.length) throw new Error("Test not found");
  const variants = qids.map((qid) =>
    generateVariant(getQuestion(qid)!, hashSeed(attemptId, qid)),
  );
  const now = Date.now();
  const attempt: ActiveAttempt = {
    id: attemptId,
    kind: "test",
    testId,
    title,
    startedAt: now,
    deadline: now + TEST_DURATION_SEC * 1000,
    durationSec: TEST_DURATION_SEC,
    variants,
  };
  db().attempts.set(attemptId, attempt);

  return {
    attemptId,
    levelTitle: title,
    durationSec: TEST_DURATION_SEC,
    deadline: attempt.deadline,
    variants: variants.map(toPublicVariant),
  };
}

function finishTest(
  a: ActiveAttempt,
  results: GradedResult[],
  correctCount: number,
): SubmitOutcome {
  const total = a.variants.length;
  const percent = total ? Math.round((correctCount / total) * 100) : 0;
  const tid = a.testId!;
  const prev = db().testResults[tid];
  db().testResults[tid] = {
    attempts: (prev?.attempts ?? 0) + 1,
    bestPercent: Math.max(prev?.bestPercent ?? 0, percent),
    lastPercent: percent,
    bestCorrect: Math.max(prev?.bestCorrect ?? 0, correctCount),
    total,
  };

  const xpEarned = correctCount * 10;
  db().game.xp += xpEarned;

  const badges = new Set(db().game.badges);
  if (total > 0 && correctCount === total) badges.add("Perfect Test");
  badges.add(`Completed ${a.title}`);
  if (db().game.xp >= 200) badges.add("200 XP Club");
  db().game.badges = [...badges];

  return {
    kind: "test",
    correctCount,
    total,
    percent,
    passed: percent >= 40,
    xpEarned,
    newlyUnlockedLevelIds: [],
    results,
  };
}

// ───────────────────────── Teacher tools ─────────────────────────
export interface PreviewVariant {
  prompt: string;
  renderedType: string;
  options?: { id: string; text: string }[];
  correctAnswer: string;
}

export function previewVariants(questionId: string, count = 3): PreviewVariant[] {
  const q = getQuestion(questionId);
  if (!q) return [];
  return Array.from({ length: count }).map((_, i) => {
    const v = generateVariant(q, hashSeed("preview", questionId, i, Date.now()));
    return {
      prompt: v.prompt,
      renderedType: v.renderedType,
      options: v.options,
      correctAnswer: answerKeyToText(v),
    };
  });
}

export function resetDemo() {
  g.__adhyan = freshDb();
}
