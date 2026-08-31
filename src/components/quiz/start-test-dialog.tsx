"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListChecks,
  Loader2,
  Play,
  RotateCcw,
  Shuffle,
  Timer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function ConfirmButton({ attempted }: { attempted: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant="success" className="flex-1" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" /> Preparing your paper…
        </>
      ) : (
        <>
          <Play className="h-5 w-5" /> {attempted ? "Start retake" : "Start test now"}
        </>
      )}
    </Button>
  );
}

/**
 * "Start test" button that first shows a confirmation dialog explaining the
 * rules: duration, question type, topic coverage and that the clock starts
 * immediately. The server action is passed in already bound to the test id.
 */
export function StartTestDialog({
  testTitle,
  courseTitle,
  questionCount,
  durationSec,
  topicCount,
  perTopic,
  attempted,
  action,
}: {
  testTitle: string;
  courseTitle: string;
  questionCount: number;
  durationSec: number;
  topicCount?: number;
  /** e.g. "4–5" — how many questions come from each topic. */
  perTopic?: string;
  attempted: boolean;
  action: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close on Escape and lock background scrolling while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const minutes = Math.round(durationSec / 60);
  const hours = minutes / 60;
  const durationLabel =
    minutes % 60 === 0 ? `${hours} hour${hours === 1 ? "" : "s"}` : `${minutes} minutes`;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full"
        variant={attempted ? "outline" : "primary"}
      >
        {attempted ? (
          <>
            <RotateCcw className="h-5 w-5" /> Retake test
          </>
        ) : (
          <>
            <Play className="h-5 w-5" /> Start test
          </>
        )}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-test-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border bg-surface p-6 shadow-xl sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="primary">
                  <ListChecks className="h-3.5 w-3.5" /> {courseTitle}
                </Badge>
                <h2 id="start-test-title" className="mt-2 text-2xl font-black">
                  {testTitle}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Key facts */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Fact icon={ListChecks} value={questionCount} label="Questions" />
              <Fact icon={Clock} value={durationLabel} label="Time limit" />
            </div>

            {/* What to expect */}
            <h3 className="mt-5 text-sm font-extrabold">What to expect</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <Item icon={CheckCircle2}>
                <b>Multiple-choice questions.</b> Every question has 4 options with exactly one
                correct answer.
              </Item>
              {topicCount && perTopic ? (
                <Item icon={Shuffle}>
                  <b>Covers the whole syllabus.</b> Questions are drawn from every one of the{" "}
                  {topicCount} topics ({perTopic} from each), so nothing is left out.
                </Item>
              ) : (
                <Item icon={Shuffle}>
                  <b>Mixed topics.</b> Questions are drawn from across the course.
                </Item>
              )}
              <Item icon={Shuffle}>
                <b>Your paper is unique.</b> Questions and option order are generated for you, so it
                differs from other students.
              </Item>
              <Item icon={Timer}>
                <b>The timer starts immediately</b> and runs on our server, so refreshing the page
                will not reset it.
              </Item>
              <Item icon={AlertTriangle} tone="text-accent">
                <b>Auto-submit at zero.</b> When time runs out your answers are submitted
                automatically. You can also submit early.
              </Item>
              <Item icon={CheckCircle2}>
                <b>Results right away.</b> Answers are graded on our servers and you will see your
                score with the correct answers and explanations.
              </Item>
            </ul>

            <p className="mt-4 rounded-lg bg-surface-muted p-3 text-xs text-muted-foreground">
              Tip: there is no negative marking, so it is worth attempting every question. You can
              move back and forth between questions before submitting.
            </p>

            {/* Actions */}
            <form action={action} className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <ConfirmButton attempted={attempted} />
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Fact({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-lg border bg-surface-muted p-3 text-center">
      <Icon className="mx-auto mb-1 h-5 w-5 text-primary" />
      <div className="text-xl font-black leading-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Item({
  icon: Icon,
  children,
  tone = "text-primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <li className="flex gap-2.5">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
      <span className="text-muted-foreground [&_b]:font-bold [&_b]:text-foreground">{children}</span>
    </li>
  );
}
