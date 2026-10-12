"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, X } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="flex-1" disabled={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing your paper…</> : label}
    </Button>
  );
}

const fmtDuration = (sec: number) => {
  const m = Math.round(sec / 60);
  return m >= 60 && m % 60 === 0 ? `${m / 60} hour${m === 60 ? "" : "s"}` : `${m} minutes`;
};

/**
 * "Start test" with a confirmation step that states the rules before the
 * server-timed clock starts. Resuming an in-progress paper skips the dialog.
 */
export function StartTestButton({
  title,
  questionCount,
  durationSec,
  topicCount,
  trial,
  part = false,
  resume,
  retake,
  action,
  variant = "primary",
  className,
}: {
  title: string;
  questionCount: number;
  durationSec: number;
  topicCount: number;
  trial: boolean;
  part?: boolean;
  resume?: boolean;
  retake?: boolean;
  action: () => Promise<void>;
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (resume) {
    return (
      <form action={action} className={className}>
        <ResumeButton variant={variant} />
      </form>
    );
  }

  const rules = [
    part
      ? `${questionCount} questions${trial ? " (free trial paper)" : ""}, all from this one topic.`
      : `${questionCount} questions${trial ? " (free trial paper)" : ""}, drawn from ${trial ? `${questionCount} different topics` : `all ${topicCount} topics`} in syllabus order.`,
    `${fmtDuration(durationSec)} on a server-side timer. The test submits automatically when time runs out.`,
    "Question formats: single choice, true / false and numeric short answer. For numeric answers, type the number only (decimals to 3 places); the unit is shown next to the box.",
    "Each correct answer earns 1 mark. There is no negative marking, and unanswered questions score zero.",
    "Use the question palette to jump between questions and mark them for review. Your answers are saved as you go.",
    "Your paper is unique to this attempt, and a retake gives you a fresh paper.",
  ];

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => setOpen(true)}>
        {retake ? "Retake test" : "Start test"}
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {trial ? "Free trial" : part ? "Part Test" : "Full Test"}
                </p>
                <h2 id="start-title" className="mt-1 text-xl font-semibold">{title}</h2>
              </div>
              <button
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x rounded-lg border text-center">
              {[
                ["Questions", questionCount],
                ["Duration", fmtDuration(durationSec)],
                ["Marks", questionCount],
              ].map(([k, v]) => (
                <div key={k} className="px-2 py-3">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="mt-0.5 font-semibold">{v}</p>
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm font-medium">Instructions</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              {rules.map((r) => <li key={r}>{r}</li>)}
            </ol>

            <form action={action} className="mt-6 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Submit label="I'm ready, start the test" />
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function ResumeButton({ variant }: { variant: ButtonProps["variant"] }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Resume test
    </Button>
  );
}
