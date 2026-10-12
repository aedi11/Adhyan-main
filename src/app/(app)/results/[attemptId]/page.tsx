import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ProficiencyBadge, Meter, PROFICIENCY_BAR, formatDuration } from "@/components/tests/bits";
import { requireUser } from "@/lib/server/auth";
import { getCourseOffer, getTestReport, getAccess, type ReviewItem } from "@/lib/server/tests";
import { cn } from "@/lib/utils";

export const metadata = { title: "Test analysis · Adhyan" };

const GRID_STYLE = {
  correct: "bg-success text-white",
  incorrect: "bg-danger text-white",
  skipped: "border bg-surface text-muted-foreground",
} as const;

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();
  const r = await getTestReport(user, attemptId);
  if (!r) notFound();
  const offer = getCourseOffer(r.courseId)!;
  const access = await getAccess(user, r.courseId);
  const paid = r.kind === "part" ? access.partAll : access.full;

  const stats: [string, string, string?][] = [
    ["Correct", `${r.correct}`, "text-success"],
    ["Incorrect", `${r.incorrect}`, "text-danger"],
    ["Unanswered", `${r.skipped}`],
    ["Accuracy", `${r.accuracy}%`],
    ["Attempt rate", `${r.attemptRate}%`],
    ["Time taken", formatDuration(r.timeTakenSec)],
    ["Avg. time / question", r.correct + r.incorrect ? `${r.avgTimePerQuestionSec}s` : "—"],
    [
      "Percentile",
      r.percentile ? `${r.percentile.percentile}` : "—",
    ],
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: `/learn/${r.courseId}?mode=${r.kind}`, label: "Back to tests" }}
        eyebrow="Test analysis"
        title={r.title}
        description={`Submitted ${new Date(r.submittedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · ${offer.title}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/analytics">Overall analytics</Link>
          </Button>
        }
      />

      {/* Score */}
      <Card className="grid gap-6 p-6 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col justify-center border-b pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <p className="text-sm text-muted-foreground">Your score</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums">
            {r.correct}
            <span className="text-2xl text-muted-foreground"> / {r.total}</span>
          </p>
          <div className="mt-4">
            <Meter value={r.scorePercent} className={r.scorePercent >= 75 ? "bg-success" : r.scorePercent >= 50 ? "bg-accent" : "bg-danger"} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{r.scorePercent}% marks</p>
          {r.percentile && (
            <p className="mt-3 text-sm">
              Rank <span className="font-semibold">{r.percentile.rank}</span> of {r.percentile.candidates}{" "}
              {r.percentile.candidates === 1 ? "candidate" : "candidates"}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(([k, v, cls]) => (
            <div key={k} className="rounded-lg bg-surface-muted px-4 py-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className={cn("mt-1 text-xl font-semibold tabular-nums", cls)}>{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {r.trial && !paid && (
        <Card className="flex flex-col gap-4 border-primary/30 bg-primary-soft/50 p-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm">
            <span className="font-semibold">This was a {r.total}-question trial paper.</span>{" "}
            <span className="text-muted-foreground">
              {r.kind === "part"
                ? `Get ${offer.partQuestions}-question Part Tests for any topic from ₹${offer.prices.partTopic}, or all ${offer.topicCount} topics for ₹${offer.prices.partPass.toLocaleString("en-IN")}.`
                : `Unlock all ${offer.testCount} full tests (${offer.questionsPerTest} questions each) with percentile ranking for ₹${offer.prices.full.toLocaleString("en-IN")}.`}
            </span>
          </p>
          <Button asChild>
            <Link href={`/checkout/${offer.id}?plan=${r.kind === "part" ? "part_pass" : "full"}`}>See plans</Link>
          </Button>
        </Card>
      )}

      {/* Question map */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Question map</h2>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-success" /> Correct ({r.correct})</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-danger" /> Incorrect ({r.incorrect})</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border" /> Unanswered ({r.skipped})</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2">
          {r.grid.map((g) =>
            g.status === "correct" ? (
              <span
                key={g.number}
                title={`Question ${g.number}: correct`}
                className={cn("flex h-10 items-center justify-center rounded-md text-xs font-medium tabular-nums", GRID_STYLE.correct)}
              >
                {g.number}
              </span>
            ) : (
              <a
                key={g.number}
                href={`#q-${g.number}`}
                title={`Question ${g.number}: ${g.status === "incorrect" ? "incorrect" : "unanswered"}, see review`}
                className={cn(
                  "flex h-10 items-center justify-center rounded-md text-xs font-medium tabular-nums hover:opacity-80",
                  GRID_STYLE[g.status],
                )}
              >
                {g.number}
              </a>
            ),
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Select a red or unanswered question to jump to its solution. Correct answers are not shown.
        </p>
      </Card>

      {/* Topic-wise */}
      <Card className="overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="font-semibold">Topic-wise performance</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Accuracy = correct ÷ attempted. Strong ≥ 75%, Average 50–74%, Weak &lt; 50%.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-y bg-surface-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-6 py-2.5 font-medium">Topic</th>
                <th className="px-3 py-2.5 text-right font-medium">Questions</th>
                <th className="px-3 py-2.5 text-right font-medium">Attempted</th>
                <th className="px-3 py-2.5 text-right font-medium">Correct</th>
                <th className="w-40 px-3 py-2.5 font-medium">Accuracy</th>
                <th className="px-3 py-2.5 text-right font-medium">Avg. time</th>
                <th className="px-6 py-2.5 font-medium">Proficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {r.topics.map((t) => (
                <tr key={t.topicId}>
                  <td className="px-6 py-3">{t.title}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{t.total}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{t.attempted}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{t.correct}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Meter value={t.accuracy ?? 0} className={PROFICIENCY_BAR[t.level]} />
                      <span className="w-10 text-right tabular-nums text-muted-foreground">
                        {t.accuracy === null ? "—" : `${t.accuracy}%`}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {t.avgTimeSec === null ? "—" : `${t.avgTimeSec}s`}
                  </td>
                  <td className="px-6 py-3"><ProficiencyBadge level={t.level} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review */}
      <section>
        <h2 className="text-lg font-semibold">Review: incorrect and unanswered questions</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {r.review.length
            ? `${r.review.length} question${r.review.length === 1 ? "" : "s"} with the correct answer and a worked solution.`
            : "Nothing to review: you answered every question correctly."}
        </p>
        <div className="mt-4 space-y-4">
          {r.review.map((q) => <ReviewCard key={q.number} q={q} />)}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/learn/${r.courseId}`}>Back to tests</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/analytics">View overall analytics</Link>
        </Button>
      </div>
    </div>
  );
}

function ReviewCard({ q }: { q: ReviewItem }) {
  const yours = q.yourAnswer;
  return (
    <Card id={`q-${q.number}`} className="scroll-mt-24 p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold">Question {q.number}</span>
        <span className="text-muted-foreground">· {q.topic}</span>
        <span
          className={cn(
            "ml-auto rounded-full px-2.5 py-0.5 font-medium",
            q.status === "incorrect" ? "bg-danger-soft text-danger" : "bg-surface-muted text-muted-foreground",
          )}
        >
          {q.status === "incorrect" ? "Incorrect" : "Not answered"}
        </span>
      </div>
      {q.type === "true_false" && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-primary">True or false?</p>
      )}
      <p className="prompt-text mt-2 text-[15px] leading-relaxed">{q.prompt}</p>
      {q.media && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.media} alt="Figure" className="mt-4 max-h-64 rounded-lg border bg-white p-2" />
      )}

      {q.options && q.type !== "true_false" ? (
        <ul className="mt-4 space-y-2">
          {q.options.map((o, i) => {
            const isCorrect = q.correctAnswer.split(", ").includes(o.text);
            const isYours = yours.split(", ").includes(o.text);
            return (
              <li
                key={o.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm",
                  isCorrect && "border-success/40 bg-success-soft",
                  isYours && !isCorrect && "border-danger/40 bg-danger-soft",
                )}
              >
                <span className="w-5 text-xs font-semibold text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                <span className="flex-1">{o.text}</span>
                {isCorrect ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                    <CheckCircle2 className="h-4 w-4" /> Correct answer
                  </span>
                ) : isYours ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                    <XCircle className="h-4 w-4" /> Your answer
                  </span>
                ) : (
                  <Circle className="h-4 w-4 text-border" />
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className={cn("rounded-lg border px-4 py-3", q.status === "incorrect" && "border-danger/40 bg-danger-soft")}>
            <dt className="text-xs text-muted-foreground">Your answer</dt>
            <dd className="mt-0.5 font-medium">{yours}</dd>
          </div>
          <div className="rounded-lg border border-success/40 bg-success-soft px-4 py-3">
            <dt className="text-xs text-muted-foreground">Correct answer</dt>
            <dd className="mt-0.5 font-medium text-success">{q.correctAnswer}</dd>
          </div>
        </dl>
      )}

      {q.explanation && (
        <div className="mt-4 rounded-lg bg-surface-muted px-4 py-3 text-sm">
          <p className="text-xs font-semibold text-muted-foreground">Solution</p>
          <p className="mt-1 leading-relaxed">{q.explanation}</p>
        </div>
      )}
    </Card>
  );
}
