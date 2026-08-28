/**
 * Progression engine — pure functions deciding level pass and topic/level
 * unlocks. Recomputed server-side after every attempt (see PROJECT_PLAN.md §4.2).
 *
 * Rules:
 *   Level pass:  bestCorrect/totalQuestions >= passThreshold% AND attempted >= minQuestions
 *   Topic unlock: student has passed Level index >= topic.unlockLevelIndex
 */
import type { AttemptResult, Course, Level, LevelProgress, Topic } from "./types";

export interface ScoredAttempt {
  correctCount: number;
  total: number;
  percent: number;
  passed: boolean;
}

/** Score a single attempt against a level's pass rule. */
export function scoreAttempt(level: Level, results: AttemptResult[]): ScoredAttempt {
  const total = level.questionIds.length;
  const correctCount = results.filter((r) => r.correct).length;
  const percent = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  const passed = results.length >= level.minQuestions && percent >= level.passThreshold;
  return { correctCount, total, percent, passed };
}

/**
 * Given prior progress for a level and a new attempt, produce updated progress
 * using best-attempt-per-question scoring (best correct count wins).
 */
export function applyAttempt(
  level: Level,
  prior: LevelProgress | undefined,
  results: AttemptResult[],
): LevelProgress {
  const score = scoreAttempt(level, results);
  const bestCorrect = Math.max(prior?.bestCorrect ?? 0, score.correctCount);
  const total = level.questionIds.length;
  const percent = total === 0 ? 0 : Math.round((bestCorrect / total) * 100);
  const passed = bestCorrect >= Math.ceil((level.passThreshold / 100) * total);
  return {
    levelId: level.id,
    status: passed ? "passed" : "in_progress",
    bestCorrect,
    attempted: Math.max(prior?.attempted ?? 0, results.length),
    percent,
  };
}

const flattenLevels = (course: Course): Level[] =>
  course.topics.flatMap((t) => t.levels);

/**
 * Compute the status of every level in a course given a map of progress so far.
 * Levels unlock sequentially within a topic; a topic unlocks when the previous
 * topic's `unlockLevelIndex` level is passed.
 */
export function computeCourseStatuses(
  course: Course,
  progress: Record<string, LevelProgress>,
): Record<string, LevelProgress> {
  const out: Record<string, LevelProgress> = {};

  const isPassed = (levelId: string) =>
    (progress[levelId]?.status ?? out[levelId]?.status) === "passed";

  course.topics.forEach((topic, topicIdx) => {
    const topicUnlocked = topicIdx === 0 || isPreviousTopicCleared(course, topicIdx, progress);

    topic.levels.forEach((level, levelIdx) => {
      const prior = progress[level.id];
      let status = prior?.status ?? "locked";

      if (!topicUnlocked) {
        status = "locked";
      } else if (levelIdx === 0) {
        status = prior?.status === "passed" ? "passed" : prior?.status ?? "unlocked";
        if (status === "locked") status = "unlocked";
      } else {
        const prevPassed = isPassed(topic.levels[levelIdx - 1].id);
        if (prevPassed) {
          status = prior?.status === "passed" ? "passed" : prior?.status ?? "unlocked";
          if (status === "locked") status = "unlocked";
        } else {
          status = "locked";
        }
      }

      out[level.id] = {
        levelId: level.id,
        status,
        bestCorrect: prior?.bestCorrect ?? 0,
        attempted: prior?.attempted ?? 0,
        percent: prior?.percent ?? 0,
      };
    });
  });

  return out;
}

function isPreviousTopicCleared(
  course: Course,
  topicIdx: number,
  progress: Record<string, LevelProgress>,
): boolean {
  const prevTopic = course.topics[topicIdx - 1];
  if (!prevTopic) return true;
  const gateLevel = prevTopic.levels[prevTopic.unlockLevelIndex];
  if (!gateLevel) return true;
  return progress[gateLevel.id]?.status === "passed";
}

/** Overall course completion percentage (passed levels / total levels). */
export function courseCompletion(
  course: Course,
  progress: Record<string, LevelProgress>,
): number {
  const levels = flattenLevels(course);
  if (!levels.length) return 0;
  const passed = levels.filter((l) => progress[l.id]?.status === "passed").length;
  return Math.round((passed / levels.length) * 100);
}

/** Per-topic mastery percentage. */
export function topicMastery(topic: Topic, progress: Record<string, LevelProgress>): number {
  if (!topic.levels.length) return 0;
  const sum = topic.levels.reduce((acc, l) => acc + (progress[l.id]?.percent ?? 0), 0);
  return Math.round(sum / topic.levels.length);
}

/** The next level the student should play: first unlocked/in-progress level in order. */
export function nextActionableLevel(
  course: Course,
  progress: Record<string, LevelProgress>,
): { topic: Topic; level: Level } | null {
  for (const topic of course.topics) {
    for (const level of topic.levels) {
      const s = progress[level.id]?.status;
      if (s === "unlocked" || s === "in_progress") return { topic, level };
    }
  }
  return null;
}

/** XP awarded for an attempt — rewards correctness with a level-difficulty bonus. */
export function xpForAttempt(results: AttemptResult[], justPassed: boolean): number {
  const base = results.filter((r) => r.correct).length * 10;
  return base + (justPassed ? 50 : 0);
}
