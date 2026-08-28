"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  Timer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, formatClock } from "@/lib/utils";
import type { PublicVariant } from "@/lib/domain/types";
import type { SubmittedAnswer } from "@/lib/domain/grading";
import { gradeQuiz } from "@/app/actions";
import type { SubmitOutcome } from "@/lib/data/store";
import { ResultScreen } from "@/components/quiz/result-screen";

type AnswerMap = Record<string, SubmittedAnswer>;

export function QuizPlayer({
  attemptId,
  levelTitle,
  remainingSec,
  variants,
}: {
  attemptId: string;
  levelTitle: string;
  remainingSec: number;
  variants: PublicVariant[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [secondsLeft, setSecondsLeft] = useState(remainingSec);
  const [phase, setPhase] = useState<"playing" | "grading" | "done">("playing");
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const submittedRef = useRef(false);

  const current = variants[index];
  const total = variants.length;
  const answeredCount = Object.keys(answers).length;

  const setAnswer = useCallback((questionId: string, value: SubmittedAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setPhase("grading");
    const result = await gradeQuiz(attemptId, answers);
    setOutcome(result);
    setPhase("done");
  }, [answers, attemptId]);

  // Server-authoritative countdown (client display only). Auto-submit at 0.
  useEffect(() => {
    if (phase !== "playing") return;
    if (secondsLeft <= 0) {
      void submit();
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft, phase, submit]);

  const lowTime = secondsLeft <= 15;

  if (phase === "done" && outcome) {
    return (
      <ResultScreen
        levelTitle={levelTitle}
        outcome={outcome}
        onReview={() =>
          router.push(
            outcome.kind === "test"
              ? "/learn"
              : outcome.placement
                ? `/learn/${outcome.placement.courseId}`
                : "/learn",
          )
        }
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-4">
      {/* Header: exit, progress, timer */}
      <div className="flex items-center gap-3">
        <Link
          href="/learn"
          aria-label="Exit quiz"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted"
        >
          <X className="h-5 w-5" />
        </Link>
        <Progress value={(index / total) * 100} className="h-3" />
        <div
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold tabular-nums",
            lowTime ? "animate-pulse bg-danger/15 text-danger" : "bg-surface-muted text-foreground",
          )}
        >
          <Timer className="h-4 w-4" /> {formatClock(secondsLeft)}
        </div>
      </div>

      <div className="mt-2 text-center text-xs font-bold text-muted-foreground">
        {levelTitle} · Question {index + 1} of {total}
      </div>

      {/* Question card */}
      <div className="no-select mt-6 flex flex-1 flex-col" onContextMenu={(e) => e.preventDefault()}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.questionId}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col"
          >
            <QuestionView
              variant={current}
              answer={answers[current.questionId]}
              onAnswer={(a) => setAnswer(current.questionId, a)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t bg-background/80 py-4 backdrop-blur">
        <Button
          variant="ghost"
          size="md"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="h-5 w-5" /> Back
        </Button>
        <span className="text-xs font-bold text-muted-foreground">
          {answeredCount}/{total} answered
        </span>
        <div className="flex-1" />
        {index < total - 1 ? (
          <Button onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}>
            Next <ArrowRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="success"
            onClick={submit}
            disabled={phase === "grading"}
          >
            {phase === "grading" ? "Grading…" : "Submit"} <Check className="h-5 w-5" />
          </Button>
        )}
      </div>

      {lowTime && phase === "playing" && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-danger px-4 py-2 text-sm font-bold text-white shadow-lg">
            <AlertTriangle className="h-4 w-4" /> Hurry — time almost up!
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionView({
  variant,
  answer,
  onAnswer,
}: {
  variant: PublicVariant;
  answer: SubmittedAnswer | undefined;
  onAnswer: (a: SubmittedAnswer) => void;
}) {
  const isMultiple = variant.renderedType === "multiple";
  const isValue = variant.renderedType === "integer" || variant.renderedType === "fill_blank";

  const selectedIds = useMemo(
    () => (answer?.kind === "options" ? new Set(answer.optionIds) : new Set<string>()),
    [answer],
  );

  const toggleOption = (id: string) => {
    if (isMultiple) {
      const next = new Set(selectedIds);
      next.has(id) ? next.delete(id) : next.add(id);
      onAnswer({ kind: "options", optionIds: [...next] });
    } else {
      onAnswer({ kind: "options", optionIds: [id] });
    }
  };

  return (
    <div>
      <h2 className="text-balance text-xl font-extrabold leading-snug sm:text-2xl">
        {variant.prompt}
      </h2>

      {variant.media && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={variant.media}
          alt="Question figure"
          className="mt-4 w-full max-w-md self-start rounded-lg border bg-white p-2"
        />
      )}

      {isValue ? (
        <div className="mt-8">
          <input
            inputMode={variant.renderedType === "integer" ? "decimal" : "text"}
            autoFocus
            placeholder={variant.renderedType === "integer" ? "Enter a number" : "Type your answer"}
            value={answer?.kind === "value" ? answer.value : ""}
            onChange={(e) => onAnswer({ kind: "value", value: e.target.value })}
            className="w-full rounded-lg border-2 bg-surface px-4 py-4 text-lg font-bold outline-none transition-colors focus:border-primary"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {variant.renderedType === "integer"
              ? "Numeric answer — decimals allowed."
              : "Short text answer."}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {variant.options?.map((opt, i) => {
            const selected = selectedIds.has(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleOption(opt.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border-2 bg-surface p-4 text-left font-semibold transition-all active:scale-[0.99]",
                  selected
                    ? "border-primary bg-primary-soft text-primary"
                    : "hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 text-sm font-black",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {isMultiple
                    ? selected
                      ? <Check className="h-4 w-4" />
                      : ""
                    : String.fromCharCode(65 + i)}
                </span>
                {opt.text}
              </button>
            );
          })}
          {isMultiple && (
            <p className="text-xs text-muted-foreground">Select all that apply.</p>
          )}
        </div>
      )}
    </div>
  );
}
