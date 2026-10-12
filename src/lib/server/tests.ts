import "server-only";
import crypto from "node:crypto";
import type { PublicVariant } from "@/lib/domain/types";
import { generateVariant, hashSeed, toPublicVariant } from "@/lib/domain/transform";
import { gradeAnswer, type SubmittedAnswer } from "@/lib/domain/grading";
import {
  answerKeyToText,
  ELL100_ID,
  getQuestion,
  seededShuffle,
  selectEll100Questions,
  submittedToText,
} from "@/lib/data/store";
import {
  ELL1000_COURSE_SUBTITLE,
  ELL1000_COURSE_TITLE,
  ELL1000_TOPICS,
  ELL1000_TOTAL,
} from "@/lib/data/ell1000";
import { ELL100_TEST_COUNT, TEST_QUESTION_COUNT } from "@/lib/data/ell100-topics";
import { TEST_DURATION_SEC } from "@/lib/config";
import { repo, type Plan, type Purchase, type QuestionOutcome, type TestAttempt, type TestKind } from "./repo";
import type { SessionUser } from "./auth";

// ───────────────────────── Course offer ─────────────────────────

export interface PlanPrices {
  full: number; // Full Test Series (10 full tests)
  partTopic: number; // one topic's Part Test
  partPass: number; // all topics' Part Tests
  bundle: number; // Full + all Part Tests
}

export interface CourseOffer {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  subject: string;
  questionBank: number;
  topicCount: number;
  testCount: number;
  questionsPerTest: number;
  durationSec: number;
  partQuestions: number; // questions per Part Test (one topic)
  partDurationSec: number;
  prices: PlanPrices;
  trialTests: number; // how many Full Tests have a free trial paper
  trialQuestions: number; // questions in each free trial paper
  trialDurationSec: number;
  passCreditDays: number; // single-topic spend counts towards the Pass within this window
}

/** Same pace everywhere: 2 h / 100 Q = 72 s per question. */
const SEC_PER_Q = TEST_DURATION_SEC / TEST_QUESTION_COUNT;

export const ELL_OFFER: CourseOffer = {
  id: ELL100_ID,
  title: ELL1000_COURSE_TITLE,
  subtitle: ELL1000_COURSE_SUBTITLE,
  description:
    "Full-length tests across the whole syllabus, plus topic-wise Part Tests: circuit elements, network analysis and theorems, transients, AC and three-phase circuits, electronics, magnetic circuits and electrical machines.",
  subject: "Electrical Engineering",
  questionBank: ELL1000_TOTAL,
  topicCount: ELL1000_TOPICS.length,
  testCount: ELL100_TEST_COUNT,
  questionsPerTest: TEST_QUESTION_COUNT,
  durationSec: TEST_DURATION_SEC,
  partQuestions: 50,
  partDurationSec: Math.round(SEC_PER_Q * 50),
  prices: { full: 1500, partTopic: 99, partPass: 1900, bundle: 2999 },
  trialTests: 2,
  trialQuestions: 10,
  trialDurationSec: Math.round(SEC_PER_Q * 10),
  passCreditDays: 30,
};

const OFFERS = [ELL_OFFER];

export function listCourses(): CourseOffer[] {
  return OFFERS;
}

export function getCourseOffer(courseId: string): CourseOffer | undefined {
  return OFFERS.find((c) => c.id === courseId);
}

const TOPIC_OF = new Map<string, string>();
for (const t of ELL1000_TOPICS) for (const qid of t.questionIds) TOPIC_OF.set(qid, t.id);
const TOPIC_TITLE = new Map(ELL1000_TOPICS.map((t) => [t.id, t.title]));
export const topicTitle = (id: string) => TOPIC_TITLE.get(id) ?? "Other";

// ───────────────────────── Access & plans ─────────────────────────

export interface Access {
  full: boolean; // all 10 Full Tests
  partAll: boolean; // every topic's Part Test
  topics: Set<string>; // single topics bought
  purchases: Purchase[];
}

/** What a student owns for a course. Admins own everything. */
export async function getAccess(user: SessionUser, courseId: string): Promise<Access> {
  const purchases = await repo().listUserPurchases(user.id, courseId);
  const has = (p: Plan) => purchases.some((x) => x.plan === p);
  return {
    full: user.isAdmin || has("full") || has("bundle"),
    partAll: user.isAdmin || has("part_pass") || has("bundle"),
    topics: new Set(purchases.filter((x) => x.plan === "part_topic").map((x) => x.topicId)),
    purchases,
  };
}

export const canTakePart = (a: Access, topicId: string) => a.partAll || a.topics.has(topicId);

export interface Quote {
  plan: Plan;
  topicId: string;
  name: string;
  price: number;
  credit: number; // earlier spend counted towards this plan
  payable: number;
  owned: boolean;
}

/**
 * Price of a plan for this student, after upgrade credits:
 *  - single topics bought in the last 30 days count towards the All-Topics Pass;
 *  - everything already paid for the course counts towards the Bundle.
 */
export function quote(offer: CourseOffer, access: Access, plan: Plan, topicId = ""): Quote {
  const paid = (p: Plan, since = 0) =>
    access.purchases
      .filter((x) => x.plan === p && Date.parse(x.createdAt) >= since)
      .reduce((s, x) => s + x.amountInr, 0);
  const { prices } = offer;
  const make = (name: string, price: number, credit: number, owned: boolean): Quote => ({
    plan,
    topicId,
    name,
    price,
    credit: Math.min(credit, price),
    payable: Math.max(0, price - credit),
    owned,
  });
  switch (plan) {
    case "full":
      return make("Full Test Series", prices.full, 0, access.full);
    case "part_topic":
      return make(
        `Part Test: ${topicTitle(topicId)}`,
        prices.partTopic,
        0,
        canTakePart(access, topicId),
      );
    case "part_pass":
      return make(
        "Part Test: All-Topics Pass",
        prices.partPass,
        paid("part_topic", Date.now() - offer.passCreditDays * 86400_000),
        access.partAll,
      );
    case "bundle":
      return make(
        "Complete Bundle",
        prices.bundle,
        paid("full") + paid("part_pass") + paid("part_topic"),
        access.full && access.partAll,
      );
  }
}

/** Simulated checkout — records the purchase. Swap for Razorpay verification later. */
export async function completeSimulatedPurchase(
  user: SessionUser,
  courseId: string,
  plan: Plan,
  topicId = "",
) {
  const offer = getCourseOffer(courseId);
  if (!offer) throw new Error("Course not found");
  if (plan === "part_topic" && !TOPIC_TITLE.has(topicId)) throw new Error("Topic not found");
  const q = quote(offer, await getAccess(user, courseId), plan, plan === "part_topic" ? topicId : "");
  if (q.owned) return;
  await repo().addPurchase({
    userId: user.id,
    courseId,
    plan,
    topicId: q.topicId,
    amountInr: q.payable,
    reference: `SIM-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
    createdAt: new Date().toISOString(),
  });
}

export type TestStatus = "not_started" | "in_progress" | "completed";

export interface TestCard {
  kind: TestKind;
  index: number; // test number (full) or topic index (part)
  topicId?: string;
  title: string;
  locked: boolean;
  trial: boolean; // would start as the free 10-question paper
  questionCount: number;
  durationSec: number;
  status: TestStatus;
  attempts: number;
  bestPercent: number | null;
  lastPercent: number | null;
  inProgressId?: string;
  lastResultId?: string;
}

const isLive = (a: TestAttempt) => a.status === "in_progress" && Date.now() <= a.deadline + 2000;
const pct = (a: TestAttempt) => Math.round(((a.correct ?? 0) / a.total) * 100);

function card(
  attempts: TestAttempt[],
  base: Omit<TestCard, "status" | "attempts" | "bestPercent" | "lastPercent">,
): TestCard {
  // Only count attempts of the paper the student currently has access to.
  const mine = attempts.filter(
    (a) => a.kind === base.kind && a.testIndex === base.index && a.trial === base.trial,
  );
  const done = mine.filter((a) => a.status === "submitted");
  const live = mine.find(isLive);
  return {
    ...base,
    status: live ? "in_progress" : done.length ? "completed" : "not_started",
    attempts: done.length,
    bestPercent: done.length ? Math.max(...done.map(pct)) : null,
    lastPercent: done.length ? pct(done[done.length - 1]) : null,
    inProgressId: live?.id,
    lastResultId: done[done.length - 1]?.id,
  };
}

export async function listTests(user: SessionUser, courseId: string) {
  const offer = getCourseOffer(courseId);
  if (!offer) return null;
  const access = await getAccess(user, courseId);
  const attempts = await repo().listAttempts(user.id, courseId);

  const tests: TestCard[] = Array.from({ length: offer.testCount }, (_, index) => {
    const trial = !access.full && index < offer.trialTests;
    return card(attempts, {
      kind: "full",
      index,
      title: `Test ${index + 1}`,
      locked: !access.full && !trial,
      trial,
      questionCount: trial ? offer.trialQuestions : offer.questionsPerTest,
      durationSec: trial ? offer.trialDurationSec : offer.durationSec,
    });
  });

  const parts: TestCard[] = ELL1000_TOPICS.map((t, index) => {
    const owned = canTakePart(access, t.id);
    const trial = !owned && index === 0; // Topic 1 is the free Part Test trial
    return card(attempts, {
      kind: "part",
      index,
      topicId: t.id,
      title: t.title,
      locked: !owned && !trial,
      trial,
      questionCount: trial ? offer.trialQuestions : Math.min(offer.partQuestions, t.questionIds.length),
      durationSec: trial ? offer.trialDurationSec : offer.partDurationSec,
    });
  });

  // `paid` = owns the Full Test Series (kept for existing callers).
  return { offer, access, paid: access.full, tests, parts };
}

// ───────────────────────── Starting & taking a test ─────────────────────────

/** Free trial paper: one question from each of 10 topics, seeded per attempt. */
function selectTrialQuestions(attemptId: string, testIndex: number, count: number): string[] {
  const topics = seededShuffle(ELL1000_TOPICS, hashSeed(attemptId, "trial-topics", testIndex))
    .slice(0, count)
    .sort((a, b) => ELL1000_TOPICS.indexOf(a) - ELL1000_TOPICS.indexOf(b));
  return topics.map((t) => seededShuffle(t.questionIds, hashSeed(attemptId, t.id, testIndex))[0]);
}

/** Part Test paper: `count` questions from one topic, a fresh draw per attempt. */
function selectTopicQuestions(attemptId: string, topicIndex: number, count: number): string[] {
  const t = ELL1000_TOPICS[topicIndex];
  return seededShuffle(t.questionIds, hashSeed(attemptId, "part", t.id)).slice(0, count);
}

export async function startTest(
  user: SessionUser,
  courseId: string,
  kind: TestKind,
  testIndex: number,
): Promise<{ ok: true; attemptId: string } | { ok: false; reason: "locked" | "not_found" }> {
  const listing = await listTests(user, courseId);
  const c = listing ? (kind === "part" ? listing.parts : listing.tests)[testIndex] : undefined;
  if (!listing || !c) return { ok: false, reason: "not_found" };
  if (c.locked) return { ok: false, reason: "locked" };
  if (c.inProgressId) return { ok: true, attemptId: c.inProgressId }; // resume

  const id = crypto.randomUUID();
  const qids =
    kind === "part"
      ? selectTopicQuestions(id, testIndex, c.questionCount)
      : c.trial
        ? selectTrialQuestions(id, testIndex, c.questionCount)
        : selectEll100Questions(id, testIndex);
  const variants = qids.map((qid) => generateVariant(getQuestion(qid)!, hashSeed(id, qid)));
  const now = Date.now();
  const title = kind === "part" ? `Part Test · ${c.title}` : c.title;
  await repo().createAttempt({
    id,
    userId: user.id,
    courseId,
    kind,
    testIndex,
    title: c.trial ? `${title} · Free trial` : title,
    trial: c.trial,
    startedAt: now,
    deadline: now + c.durationSec * 1000,
    durationSec: c.durationSec,
    variants,
    status: "in_progress",
    answers: {},
    total: variants.length,
  });
  return { ok: true, attemptId: id };
}

export interface PlayerView {
  attemptId: string;
  courseId: string;
  title: string;
  remainingSec: number;
  variants: PublicVariant[];
  answers: Record<string, SubmittedAnswer>;
}

async function ownedAttempt(user: SessionUser, attemptId: string) {
  const a = await repo().getAttempt(attemptId);
  return a && a.userId === user.id ? a : null;
}

/** Player view, or "submitted" if the attempt is over (expired ones get finalised). */
export async function getPlayerView(
  user: SessionUser,
  attemptId: string,
): Promise<PlayerView | "submitted" | null> {
  const a = await ownedAttempt(user, attemptId);
  if (!a) return null;
  if (a.status === "submitted") return "submitted";
  if (Date.now() > a.deadline + 2000) {
    await finalize(a, a.answers ?? {}, {});
    return "submitted";
  }
  return {
    attemptId: a.id,
    courseId: a.courseId,
    title: a.title,
    remainingSec: Math.max(0, Math.round((a.deadline - Date.now()) / 1000)),
    variants: a.variants.map(toPublicVariant),
    answers: a.answers ?? {},
  };
}

/** Autosave answers mid-test (refresh-safe). Ignored once the time is up. */
export async function saveAnswers(
  user: SessionUser,
  attemptId: string,
  answers: Record<string, SubmittedAnswer>,
) {
  const a = await ownedAttempt(user, attemptId);
  if (!a || a.status !== "in_progress" || Date.now() > a.deadline) return;
  a.answers = answers;
  await repo().updateAttempt(a);
}

export async function submitTest(
  user: SessionUser,
  attemptId: string,
  answers: Record<string, SubmittedAnswer>,
  timeSpent: Record<string, number>,
) {
  const a = await ownedAttempt(user, attemptId);
  if (!a) throw new Error("Attempt not found");
  if (a.status === "submitted") return; // idempotent
  // Answers that arrive after the deadline don't count; keep the last autosave.
  const late = Date.now() > a.deadline + 5000;
  await finalize(a, late ? (a.answers ?? {}) : answers, timeSpent);
}

function isAnswered(ans: SubmittedAnswer | undefined): ans is SubmittedAnswer {
  if (!ans) return false;
  return ans.kind === "options" ? ans.optionIds.length > 0 : ans.value.trim() !== "";
}

async function finalize(
  a: TestAttempt,
  answers: Record<string, SubmittedAnswer>,
  timeSpent: Record<string, number>,
) {
  const outcomes: QuestionOutcome[] = a.variants.map((v) => {
    const ans = answers[v.questionId];
    const answered = isAnswered(ans);
    return {
      questionId: v.questionId,
      topicId: TOPIC_OF.get(v.questionId) ?? "other",
      status: !answered ? "skipped" : gradeAnswer(v, ans) ? "correct" : "incorrect",
      timeSec: Math.max(0, Math.round(timeSpent[v.questionId] ?? 0)),
      yourAnswer: answered ? submittedToText(v, ans) : "—",
      correctAnswer: answerKeyToText(v),
    };
  });
  const now = Date.now();
  a.status = "submitted";
  a.submittedAt = now;
  a.answers = answers;
  a.outcomes = outcomes;
  a.correct = outcomes.filter((o) => o.status === "correct").length;
  a.attempted = outcomes.filter((o) => o.status !== "skipped").length;
  a.timeTakenSec = Math.min(a.durationSec, Math.round((now - a.startedAt) / 1000));
  await repo().updateAttempt(a);
}

// ───────────────────────── Analysis ─────────────────────────
// Standard mock-test performance analysis (as used by CBT test-prep
// platforms): score, accuracy, attempt rate, speed, percentile rank and
// topic-wise strength classification.

export type Proficiency = "Strong" | "Average" | "Weak" | "Not attempted";

export function proficiency(accuracy: number | null, attempted: number): Proficiency {
  if (!attempted || accuracy === null) return "Not attempted";
  if (accuracy >= 75) return "Strong";
  if (accuracy >= 50) return "Average";
  return "Weak";
}

export interface TopicStat {
  topicId: string;
  title: string;
  total: number;
  attempted: number;
  correct: number;
  accuracy: number | null; // correct / attempted
  avgTimeSec: number | null;
  level: Proficiency;
}

function topicStats(outcomes: QuestionOutcome[]): TopicStat[] {
  const by = new Map<string, QuestionOutcome[]>();
  for (const o of outcomes) by.set(o.topicId, [...(by.get(o.topicId) ?? []), o]);
  const order = ELL1000_TOPICS.map((t) => t.id);
  return [...by.entries()]
    .sort(([x], [y]) => order.indexOf(x) - order.indexOf(y))
    .map(([topicId, list]) => {
      const attempted = list.filter((o) => o.status !== "skipped");
      const correct = list.filter((o) => o.status === "correct").length;
      const accuracy = attempted.length ? Math.round((correct / attempted.length) * 100) : null;
      const time = attempted.reduce((s, o) => s + o.timeSec, 0);
      return {
        topicId,
        title: topicTitle(topicId),
        total: list.length,
        attempted: attempted.length,
        correct,
        accuracy,
        avgTimeSec: attempted.length ? Math.round(time / attempted.length) : null,
        level: proficiency(accuracy, attempted.length),
      };
    });
}

/** Percentile rank = (B + 0.5·E) / N × 100 over each user's first full attempt. */
async function percentileFor(a: TestAttempt) {
  if (a.trial) return null;
  const scores = await repo().peerScores(a.courseId, a.kind, a.testIndex);
  const firstByUser = new Map<string, number>();
  for (const s of scores) if (!firstByUser.has(s.userId)) firstByUser.set(s.userId, s.correct);
  firstByUser.set(a.userId, firstByUser.get(a.userId) ?? a.correct ?? 0);
  const all = [...firstByUser.values()];
  const mine = a.correct ?? 0;
  const below = all.filter((s) => s < mine).length;
  const equal = all.filter((s) => s === mine).length;
  return {
    percentile: Math.round(((below + 0.5 * equal) / all.length) * 1000) / 10,
    rank: all.filter((s) => s > mine).length + 1,
    candidates: all.length,
  };
}

export interface ReviewItem {
  number: number;
  prompt: string;
  type: string;
  media?: string;
  options?: { id: string; text: string }[];
  unit?: string;
  status: "incorrect" | "skipped";
  yourAnswer: string;
  correctAnswer: string;
  explanation?: string;
  topic: string;
}

export interface TestReport {
  attemptId: string;
  courseId: string;
  kind: TestKind;
  title: string;
  trial: boolean;
  submittedAt: number;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  scorePercent: number;
  accuracy: number; // correct / attempted
  attemptRate: number; // attempted / total
  timeTakenSec: number;
  durationSec: number;
  avgTimePerQuestionSec: number;
  percentile: { percentile: number; rank: number; candidates: number } | null;
  grid: { number: number; status: QuestionOutcome["status"] }[];
  topics: TopicStat[];
  review: ReviewItem[]; // incorrect + skipped only — correct ones stay hidden
}

export async function getTestReport(user: SessionUser, attemptId: string): Promise<TestReport | null> {
  const a = await ownedAttempt(user, attemptId);
  if (!a || a.status !== "submitted" || !a.outcomes) return null;
  const o = a.outcomes;
  const correct = o.filter((x) => x.status === "correct").length;
  const incorrect = o.filter((x) => x.status === "incorrect").length;
  const skipped = o.length - correct - incorrect;
  const attempted = correct + incorrect;
  const spent = o.reduce((s, x) => s + x.timeSec, 0);

  const review: ReviewItem[] = [];
  o.forEach((x, i) => {
    if (x.status === "correct") return;
    const v = a.variants[i];
    review.push({
      number: i + 1,
      prompt: v.prompt,
      type: v.renderedType,
      media: v.media,
      options: v.options,
      unit: v.unit,
      status: x.status,
      yourAnswer: x.yourAnswer,
      correctAnswer: x.correctAnswer,
      explanation: v.explanation,
      topic: topicTitle(x.topicId),
    });
  });

  return {
    attemptId: a.id,
    courseId: a.courseId,
    kind: a.kind,
    title: a.title,
    trial: a.trial,
    submittedAt: a.submittedAt ?? a.startedAt,
    total: o.length,
    correct,
    incorrect,
    skipped,
    scorePercent: Math.round((correct / o.length) * 100),
    accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
    attemptRate: Math.round((attempted / o.length) * 100),
    timeTakenSec: a.timeTakenSec ?? 0,
    durationSec: a.durationSec,
    avgTimePerQuestionSec: attempted ? Math.round(spent / attempted) : 0,
    percentile: await percentileFor(a),
    grid: o.map((x, i) => ({ number: i + 1, status: x.status })),
    topics: topicStats(o),
    review,
  };
}

export interface PerformanceSummary {
  completedTests: number; // distinct tests completed
  totalTests: number;
  inProgress: number;
  attemptsTaken: number;
  avgScore: number | null;
  bestScore: number | null;
  accuracy: number | null;
  attemptRate: number | null;
  avgTimePerQuestionSec: number | null;
  questionsSolved: number;
  trend: { label: string; title: string; score: number; accuracy: number; date: number; attemptId: string }[];
  best: { title: string; score: number; accuracy: number; level: Proficiency; attemptId: string }[];
  topics: TopicStat[];
  strengths: TopicStat[];
  weaknesses: TopicStat[];
}

export async function getPerformance(user: SessionUser, courseId: string): Promise<PerformanceSummary> {
  const offer = getCourseOffer(courseId)!;
  const all = await repo().listAttempts(user.id, courseId);
  const done = all.filter((a) => a.status === "submitted" && a.outcomes);
  const outcomes = done.flatMap((a) => a.outcomes!);
  const attempted = outcomes.filter((o) => o.status !== "skipped");
  const correct = outcomes.filter((o) => o.status === "correct").length;
  const pct = (a: TestAttempt) => Math.round(((a.correct ?? 0) / a.total) * 100);
  const acc = (a: TestAttempt) =>
    a.attempted ? Math.round(((a.correct ?? 0) / a.attempted) * 100) : 0;

  const topics = topicStats(outcomes);
  const ranked = topics.filter((t) => t.accuracy !== null);
  return {
    completedTests: new Set(done.filter((a) => a.kind === "full").map((a) => `${a.testIndex}:${a.trial}`)).size,
    totalTests: offer.testCount,
    inProgress: all.filter(isLive).length,
    attemptsTaken: done.length,
    avgScore: done.length ? Math.round(done.reduce((s, a) => s + pct(a), 0) / done.length) : null,
    bestScore: done.length ? Math.max(...done.map(pct)) : null,
    accuracy: attempted.length ? Math.round((correct / attempted.length) * 100) : null,
    attemptRate: outcomes.length ? Math.round((attempted.length / outcomes.length) * 100) : null,
    avgTimePerQuestionSec: attempted.length
      ? Math.round(attempted.reduce((s, o) => s + o.timeSec, 0) / attempted.length)
      : null,
    questionsSolved: correct,
    trend: done.map((a) => ({
      label: `${a.kind === "part" ? "P" : "T"}${a.testIndex + 1}${a.trial ? " (trial)" : ""}`,
      title: a.title,
      score: pct(a),
      accuracy: acc(a),
      date: a.submittedAt ?? a.startedAt,
      attemptId: a.id,
    })),
    best: [...done]
      .sort((x, y) => pct(y) - pct(x))
      .slice(0, 4)
      .map((a) => ({
        title: a.title,
        score: pct(a),
        accuracy: acc(a),
        level: proficiency(pct(a), a.total),
        attemptId: a.id,
      })),
    topics,
    strengths: [...ranked].sort((x, y) => y.accuracy! - x.accuracy!).filter((t) => t.level === "Strong").slice(0, 5),
    weaknesses: [...ranked].sort((x, y) => x.accuracy! - y.accuracy!).filter((t) => t.level === "Weak").slice(0, 5),
  };
}
