import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { TrendChart } from "@/components/charts";
import { Meter, PROFICIENCY_BAR, ProficiencyBadge } from "@/components/tests/bits";
import { requireUser } from "@/lib/server/auth";
import { ELL_OFFER, getPerformance, type TopicStat } from "@/lib/server/tests";
import { ELL1000_TOPICS } from "@/lib/data/ell1000";

export const metadata = { title: "Analytics · Adhyan" };

export default async function AnalyticsPage() {
  const user = await requireUser();
  const p = await getPerformance(user, ELL_OFFER.id);

  if (!p.attemptsTaken) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Analytics" title="Performance analytics" />
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No tests submitted yet</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Your score trend, accuracy, speed and topic-wise strengths appear here once you submit your
            first test.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/learn/${ELL_OFFER.id}`}>Take a test</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // All syllabus topics, including ones not yet attempted.
  const byId = new Map(p.topics.map((t) => [t.topicId, t]));
  const topics: TopicStat[] = ELL1000_TOPICS.map(
    (t) =>
      byId.get(t.id) ?? {
        topicId: t.id,
        title: t.title,
        total: 0,
        attempted: 0,
        correct: 0,
        accuracy: null,
        avgTimeSec: null,
        level: "Not attempted",
      },
  );
  const levelCount = (l: TopicStat["level"]) => topics.filter((t) => t.level === l).length;

  const kpis: [string, string, string][] = [
    ["Tests completed", `${p.completedTests}`, `of ${p.totalTests} tests`],
    ["Average score", `${p.avgScore}%`, `over ${p.attemptsTaken} attempt${p.attemptsTaken === 1 ? "" : "s"}`],
    ["Best score", `${p.bestScore}%`, "highest single attempt"],
    ["Accuracy", `${p.accuracy ?? 0}%`, "correct ÷ attempted"],
    ["Attempt rate", `${p.attemptRate ?? 0}%`, "attempted ÷ total"],
    ["Speed", p.avgTimePerQuestionSec !== null ? `${p.avgTimePerQuestionSec}s` : "—", "avg. time per question"],
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="Performance analytics"
        description={`${ELL_OFFER.title} · computed from all your submitted tests`}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([k, v, sub]) => (
          <Card key={k} className="p-5">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="p-6">
          <h2 className="font-semibold">Score trend</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Score and accuracy across your attempts, oldest first. T = Full Test, P = Part Test (topic number).</p>
          <div className="mt-4">
            <TrendChart data={p.trend} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold">Topic coverage</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{topics.length} syllabus topics</p>
          <ul className="mt-5 space-y-3 text-sm">
            {(["Strong", "Average", "Weak", "Not attempted"] as const).map((l) => (
              <li key={l} className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${PROFICIENCY_BAR[l]}`} />
                <span className="flex-1">{l}</span>
                <span className="font-semibold tabular-nums">{levelCount(l)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-surface-muted">
            {(["Strong", "Average", "Weak", "Not attempted"] as const).map((l) => (
              <span key={l} className={PROFICIENCY_BAR[l]} style={{ width: `${(levelCount(l) / topics.length) * 100}%` }} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FocusList
          title="Strongest topics"
          empty="No topic has reached 75% accuracy yet."
          items={p.strengths}
        />
        <FocusList
          title="Topics to work on"
          empty="No weak topics, nothing is below 50% accuracy."
          items={p.weaknesses}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="font-semibold">Topic-wise mastery</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Aggregated over every question you have seen. Strong ≥ 75%, Average 50–74%, Weak &lt; 50% accuracy.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-y bg-surface-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-6 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Topic</th>
                <th className="px-3 py-2.5 text-right font-medium">Seen</th>
                <th className="px-3 py-2.5 text-right font-medium">Attempted</th>
                <th className="px-3 py-2.5 text-right font-medium">Correct</th>
                <th className="w-44 px-3 py-2.5 font-medium">Accuracy</th>
                <th className="px-3 py-2.5 text-right font-medium">Avg. time</th>
                <th className="px-6 py-2.5 font-medium">Proficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topics.map((t, i) => (
                <tr key={t.topicId}>
                  <td className="px-6 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3">{t.title}</td>
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

      <Card className="overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="font-semibold">Attempt history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-y bg-surface-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-6 py-2.5 font-medium">Test</th>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 text-right font-medium">Score</th>
                <th className="px-3 py-2.5 text-right font-medium">Accuracy</th>
                <th className="px-6 py-2.5 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...p.trend].reverse().map((t) => (
                <tr key={t.attemptId}>
                  <td className="px-6 py-3">{t.title}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{t.score}%</td>
                  <td className="px-3 py-3 text-right tabular-nums">{t.accuracy}%</td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/results/${t.attemptId}`} className="text-sm font-medium text-primary hover:underline">
                      View analysis
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FocusList({ title, items, empty }: { title: string; items: TopicStat[]; empty: string }) {
  return (
    <Card className="p-6">
      <h2 className="font-semibold">{title}</h2>
      {items.length ? (
        <ul className="mt-4 space-y-3.5">
          {items.map((t) => (
            <li key={t.topicId} className="text-sm">
              <div className="flex justify-between gap-3">
                <span>{t.title}</span>
                <span className="tabular-nums text-muted-foreground">
                  {t.correct}/{t.attempted} · {t.accuracy}%
                </span>
              </div>
              <div className="mt-1.5">
                <Meter value={t.accuracy ?? 0} className={PROFICIENCY_BAR[t.level]} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </Card>
  );
}
