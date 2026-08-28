"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  addUploadedQuestions,
  clearUploadedQuestions,
  enroll,
  isPlaced,
  resetDemo,
  startAttempt,
  startPlacement,
  startTest,
  submitAttempt,
  type SubmitOutcome,
} from "@/lib/data/store";
import type { SubmittedAnswer } from "@/lib/domain/grading";
import { parseQuestionsFromText } from "@/lib/parse/docx-questions";
import { QUESTIONS_PER_TEST } from "@/lib/config";

/** Begin a timed level attempt and navigate to the quiz player. */
export async function beginQuiz(levelId: string) {
  const attempt = startAttempt(levelId);
  redirect(`/quiz/${attempt.attemptId}`);
}

/** Enroll in a course (start free trial). Sends new students to the placement test. */
export async function enrollCourse(courseId: string) {
  enroll(courseId);
  revalidatePath("/learn");
  if (isPlaced(courseId)) redirect(`/learn/${courseId}`);
  const attempt = startPlacement(courseId);
  redirect(`/quiz/${attempt.attemptId}`);
}

/** Begin (or retake) the diagnostic placement test for a course. */
export async function beginPlacement(courseId: string) {
  const attempt = startPlacement(courseId);
  redirect(`/quiz/${attempt.attemptId}`);
}

/** Grade a submitted attempt server-side (answer keys never leave the server). */
export async function gradeQuiz(
  attemptId: string,
  answers: Record<string, SubmittedAnswer>,
): Promise<SubmitOutcome> {
  const outcome = submitAttempt(attemptId, answers);
  revalidatePath("/learn");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  return outcome;
}

/** Teacher tool: generate fresh sample variants for a question (live preview). */
export async function previewQuestionVariants(questionId: string) {
  const { previewVariants } = await import("@/lib/data/store");
  return previewVariants(questionId, 3);
}

export async function resetDemoAction() {
  resetDemo();
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// ───────────────────────── Tests (upload mode) ─────────────────────────

/** Begin a timed test and navigate to the quiz player. */
export async function startTestAction(testId: string) {
  const attempt = startTest(testId);
  redirect(`/quiz/${attempt.attemptId}`);
}

export interface UploadState {
  ok: boolean;
  message: string;
  parsed?: number;
  totalQuestions?: number;
  totalTests?: number;
  warnings?: string[];
}

/**
 * Parse an uploaded Word .docx into MCQ questions and add them to the bank.
 * The bank is auto-split into fixed-size timed tests (see /tests).
 */
export async function uploadQuestionsDocx(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a .docx file to upload." };
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return { ok: false, message: "Please upload a Word .docx file (not .doc or .pdf)." };
  }

  let text = "";
  try {
    const mammoth = await import("mammoth");
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    text = result.value ?? "";
  } catch {
    return { ok: false, message: "Could not read that document. Make sure it's a valid .docx file." };
  }

  const { questions, warnings } = parseQuestionsFromText(text);
  if (questions.length === 0) {
    return {
      ok: false,
      message:
        "No questions found. Each question needs a number (1.), lettered options (A), and an answer (Answer: B).",
      warnings,
    };
  }

  const totalQuestions = addUploadedQuestions(questions);
  revalidatePath("/tests");
  revalidatePath("/teacher");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `Added ${questions.length} question${questions.length === 1 ? "" : "s"}.`,
    parsed: questions.length,
    totalQuestions,
    totalTests: Math.ceil(totalQuestions / QUESTIONS_PER_TEST),
    warnings,
  };
}

/** Remove all uploaded questions and their test results. */
export async function clearUploadedAction() {
  clearUploadedQuestions();
  revalidatePath("/tests");
  revalidatePath("/teacher");
  revalidatePath("/dashboard");
}
