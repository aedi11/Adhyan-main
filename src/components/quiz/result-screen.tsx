"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Compass, ListChecks, PartyPopper, Sparkles, Unlock, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Ring } from "@/components/ui/ring";
import { cn } from "@/lib/utils";
import type { SubmitOutcome } from "@/lib/data/store";
import { Confetti } from "@/components/quiz/confetti";

export function ResultScreen({
  levelTitle,
  outcome,
  onReview,
}: {
  levelTitle: string;
  outcome: SubmitOutcome;
  onReview: () => void;
}) {
  const { passed, percent, correctCount, total, xpEarned, results, newlyUnlockedLevelIds } =
    outcome;
  const placement = outcome.placement;
  const isTest = outcome.kind === "test";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {passed && <Confetti />}

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="text-center"
      >
        <div
          className={cn(
            "mx-auto flex h-20 w-20 items-center justify-center rounded-3xl",
            placement || isTest
              ? "bg-primary text-white"
              : passed
                ? "bg-success text-white"
                : "bg-accent text-white",
          )}
        >
          {placement ? (
            <Compass className="h-10 w-10" />
          ) : isTest ? (
            <ListChecks className="h-10 w-10" />
          ) : passed ? (
            <PartyPopper className="h-10 w-10" />
          ) : (
            <Sparkles className="h-10 w-10" />
          )}
        </div>
        <h1 className="mt-4 text-3xl font-black">
          {placement
            ? "You're all set! 🚀"
            : isTest
              ? "Test submitted! 🎯"
              : passed
                ? "Level cleared! 🎉"
                : "Good effort!"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {placement
            ? `Based on your answers, we're starting you at ${placement.startTopicTitle} · ${placement.startLevelTitle}.`
            : isTest
              ? `You scored ${percent}% on ${levelTitle} — ${correctCount} of ${total} correct.`
              : passed
                ? `You passed ${levelTitle}.`
                : `Score ${percent}% — reach the threshold to unlock the next level. Try again!`}
        </p>
      </motion.div>

      {placement && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-6 flex items-center gap-3 rounded-lg border-2 border-primary/30 bg-primary-soft p-4"
        >
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <p className="font-bold text-primary">
              {placement.placedCount > 0
                ? `Placed out of ${placement.placedCount} ${placement.placedCount === 1 ? "level" : "levels"}!`
                : "Starting from the top — let's build your foundations."}
            </p>
            <p className="text-sm text-muted-foreground">
              You can always revisit earlier levels for practice anytime.
            </p>
          </div>
        </motion.div>
      )}

      {/* Score summary */}
      <Card className="mt-8">
        <div className="flex items-center justify-around p-6">
          <Ring value={percent} label={`${percent}%`} sublabel="score" />
          <div className="space-y-3">
            <Stat icon={Check} tone="text-success" label="Correct" value={`${correctCount}/${total}`} />
            <Stat icon={Zap} tone="text-xp" label="XP earned" value={`+${xpEarned}`} />
          </div>
        </div>
      </Card>

      {/* Unlock callout */}
      {newlyUnlockedLevelIds.length > 0 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 flex items-center gap-3 rounded-lg border-2 border-success/30 bg-success-soft p-4"
        >
          <Unlock className="h-6 w-6 text-success" />
          <div>
            <p className="font-bold text-success">New content unlocked!</p>
            <p className="text-sm text-muted-foreground">
              You&apos;ve opened {newlyUnlockedLevelIds.length} new{" "}
              {newlyUnlockedLevelIds.length === 1 ? "level" : "levels/topics"}. Keep going!
            </p>
          </div>
        </motion.div>
      )}

      {/* Answer review */}
      <h2 className="mt-8 mb-3 text-lg font-extrabold">Review</h2>
      <div className="space-y-3">
        {results.map((r, i) => (
          <Card key={r.questionId} className={cn(r.correct ? "border-success/30" : "border-danger/30")}>
            <div className="flex gap-3 p-4">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
                  r.correct ? "bg-success" : "bg-danger",
                )}
              >
                {r.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Question {i + 1}</p>
                <div className="mt-1 grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    Your answer:{" "}
                    <span className={cn("font-bold", r.correct ? "text-success" : "text-danger")}>
                      {r.yourAnswer}
                    </span>
                  </span>
                  {!r.correct && (
                    <span className="text-muted-foreground">
                      Correct: <span className="font-bold text-success">{r.correctAnswer}</span>
                    </span>
                  )}
                </div>
                {r.explanation && (
                  <p className="mt-2 rounded-md bg-surface-muted p-2 text-xs text-muted-foreground">
                    💡 {r.explanation}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onReview} size="lg" className="flex-1">
          {isTest ? "Back to courses" : passed ? "Continue" : "Back to path"}
        </Button>
        <Button asChild variant="outline" size="lg" className="flex-1">
          <Link href={isTest ? "/dashboard" : "/progress"}>
            {isTest ? "Home" : "View progress"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("h-5 w-5", tone)} />
      <div>
        <div className="text-lg font-black leading-none">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
