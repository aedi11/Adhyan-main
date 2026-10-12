import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, FileText, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StartTestButton } from "@/components/tests/start-test-button";
import { formatDuration } from "@/components/tests/bits";
import { requireUser } from "@/lib/server/auth";
import { listTests, type CourseOffer, type TestCard } from "@/lib/server/tests";
import { startTestAction } from "@/app/account-actions";
import { cn } from "@/lib/utils";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default async function CourseTestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ mode?: string; purchased?: string }>;
}) {
  const { courseId } = await params;
  const { mode: modeParam, purchased } = await searchParams;
  const mode = modeParam === "part" ? "part" : "full";
  const user = await requireUser();
  const listing = await listTests(user, courseId);
  if (!listing) notFound();
  const { offer, access, tests, parts } = listing;
  const ownedTopics = parts.filter((p) => !p.locked && !p.trial).length;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/learn", label: "Courses" }}
        eyebrow={offer.subject}
        title={offer.title}
        description={`${offer.testCount} Full Tests of ${offer.questionsPerTest} questions · ${offer.topicCount} topic-wise Part Tests of ${offer.partQuestions} questions`}
      />

      {/* Mode tabs */}
      <div className="flex gap-1 rounded-xl border bg-surface p-1 sm:w-fit" role="tablist">
        {(
          [
            ["full", "Full Test", `${offer.testCount} tests`],
            ["part", "Part Test", `${offer.topicCount} topics`],
          ] as const
        ).map(([m, label, sub]) => (
          <Link
            key={m}
            href={`/learn/${courseId}?mode=${m}`}
            role="tab"
            aria-selected={mode === m}
            className={cn(
              "flex flex-1 flex-col items-center rounded-lg px-5 py-2 text-sm transition-colors sm:flex-none",
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-muted",
            )}
          >
            <span className="font-medium">{label}</span>
            <span className={cn("text-xs", mode === m ? "text-white/80" : "text-muted-foreground")}>{sub}</span>
          </Link>
        ))}
      </div>

      {purchased && (
        <Card className="flex items-center gap-3 border-success/30 bg-success-soft p-4 text-sm text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Payment successful. Your new tests are unlocked.
        </Card>
      )}

      {mode === "full" ? (
        <>
          {!access.full && (
            <PlanBanner
              title="You're on the Full Test free trial"
              body={`Tests 1 and ${offer.trialTests} are ${offer.trialQuestions}-question trial papers. Unlock all ${offer.testCount} full tests (${offer.questionsPerTest} questions each) for ${inr(offer.prices.full)}, or get everything with the Complete Bundle for ${inr(offer.prices.bundle)}.`}
              cta={`Unlock Full Tests · ${inr(offer.prices.full)}`}
              href={`/checkout/${courseId}?plan=full`}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tests.map((t) => (
              <TestTile key={t.index} t={t} offer={offer} />
            ))}
          </div>
        </>
      ) : (
        <>
          {!access.partAll && (
            <PlanBanner
              title={
                ownedTopics
                  ? `You own ${ownedTopics} of ${offer.topicCount} topics`
                  : "Part Test: practise one topic at a time"
              }
              body={`Each Part Test is ${offer.partQuestions} questions from a single topic in ${Math.round(offer.partDurationSec / 60)} minutes. Topic 1 has a free ${offer.trialQuestions}-question trial. Buy any topic for ${inr(offer.prices.partTopic)}, or all ${offer.topicCount} topics with the All-Topics Pass for ${inr(offer.prices.partPass)}; topics bought in the last ${offer.passCreditDays} days count towards the Pass.`}
              cta={`All-Topics Pass · ${inr(offer.prices.partPass)}`}
              href={`/checkout/${courseId}?plan=part_pass`}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {parts.map((t) => (
              <TestTile key={t.index} t={t} offer={offer} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlanBanner({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className="flex-1 text-sm">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{body}</p>
      </div>
      <Button asChild variant="accent" className="shrink-0">
        <Link href={href}>{cta}</Link>
      </Button>
    </Card>
  );
}

function TestTile({ t, offer }: { t: TestCard; offer: CourseOffer }) {
  const action = startTestAction.bind(null, offer.id, t.kind, t.index);
  const isPart = t.kind === "part";
  const status = t.locked
    ? { label: "Locked", cls: "bg-surface-muted text-muted-foreground" }
    : t.status === "in_progress"
      ? { label: "In progress", cls: "bg-warning-soft text-warning" }
      : t.status === "completed"
        ? { label: "Completed", cls: "bg-success-soft text-success" }
        : { label: t.trial ? "Free trial" : "Not started", cls: "bg-primary-soft text-primary" };

  return (
    <Card className={cn("flex flex-col overflow-hidden", t.locked && "bg-surface-muted/40")}>
      <div className={cn("h-1", t.locked ? "bg-border" : t.status === "completed" ? "bg-success" : "bg-primary")} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {isPart && <p className="text-xs text-muted-foreground">Topic {t.index + 1}</p>}
            <h3 className="font-semibold leading-snug sm:text-lg">{t.title}</h3>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", status.cls)}>
            {status.label}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> {t.questionCount} questions
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {formatDuration(t.durationSec)}
          </span>
        </div>

        <div className="mt-4 flex-1 text-sm">
          {t.bestPercent !== null ? (
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Best", `${t.bestPercent}%`],
                ["Last", `${t.lastPercent}%`],
                ["Attempts", t.attempts],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              {t.locked
                ? isPart
                  ? `${offer.partQuestions} questions from this topic. Buy it for ₹${offer.prices.partTopic}.`
                  : `Full 100-question test. Unlock the series for ₹${offer.prices.full.toLocaleString("en-IN")}.`
                : t.trial
                  ? isPart
                    ? "Free trial: 10 questions from this topic."
                    : "Trial paper: one question from each of 10 topics."
                  : isPart
                    ? "A fresh draw from this topic's question bank every attempt."
                    : `Covers all ${offer.topicCount} topics in syllabus order.`}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          {t.locked ? (
            <Button asChild variant="outline" className="w-full">
              <Link
                href={
                  isPart
                    ? `/checkout/${offer.id}?plan=part_topic&topic=${t.topicId}`
                    : `/checkout/${offer.id}?plan=full`
                }
              >
                <Lock className="h-4 w-4" /> {isPart ? `Buy · ₹${offer.prices.partTopic}` : "Unlock"}
              </Link>
            </Button>
          ) : (
            <>
              <StartTestButton
                className="flex-1"
                title={t.trial ? `${t.title} · Free trial` : isPart ? `Part Test · ${t.title}` : t.title}
                questionCount={t.questionCount}
                durationSec={t.durationSec}
                topicCount={offer.topicCount}
                trial={t.trial}
                part={isPart}
                resume={t.status === "in_progress"}
                retake={t.status === "completed"}
                variant={t.status === "completed" ? "outline" : "primary"}
                action={action}
              />
              {t.lastResultId && (
                <Button asChild variant="ghost">
                  <Link href={`/results/${t.lastResultId}`}>Result</Link>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
