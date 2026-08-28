/**
 * App-wide mode + branding configuration.
 *
 * Adhyan ships two experiences that share the same quiz/grading engine:
 *
 *   - "tests"  → a flat uploaded question bank, auto-split into fixed-size
 *                timed tests (the current professor-requested mode).
 *   - "levels" → the original adaptive Course → Topic → Level skill-tree with
 *                progression, unlocks, placement, and mastery.
 *
 * Level-wise features are intentionally PAUSED, not deleted. Flip APP_MODE back
 * to "levels" to restore the full adaptive experience — all of that code is
 * still present and wired.
 */
export type AppMode = "tests" | "levels";

export const APP_MODE: AppMode = "tests";

/** Branding. The professor asked for the phrase "Enhanced Learning" in the UI. */
export const BRAND_NAME = "Adhyan";
export const BRAND_TAGLINE = "Enhanced Learning";

/** Test-mode settings: how the uploaded bank is sliced into timed tests. */
export const QUESTIONS_PER_TEST = 100;
export const TEST_DURATION_SEC = 2 * 60 * 60; // 2 hours
