import { redirect } from "next/navigation";
import { Award, Flame, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Ring } from "@/components/ui/ring";
import { ProgressChart } from "@/components/progress-chart";
import {
  getActiveCourseId,
  getCompletion,
  getCourse,
  getGamification,
  getHistory,
  getStatuses,
} from "@/lib/data/store";
import { topicMastery } from "@/lib/domain/progression";
import { APP_MODE } from "@/lib/config";

const ALL_BADGES = [
  "Perfect Level",
  "200 XP Club",
  "Cleared Level 1",
  "Cleared Level 2",
  "Cleared Level 3",
];

export default function ProgressPage() {
  // Level-based progress/mastery is paused in tests mode (see APP_MODE).
  if (APP_MODE === "tests") redirect("/learn");

  const activeCourseId = getActiveCourseId();
  const course = getCourse(activeCourseId ?? undefined);
  const statuses = getStatuses(course.id);
  const game = getGamification();
  const completion = getCompletion(course.id);
  const history = getHistory();

  // Build a 7-day window for the activity chart.
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const entry = history.find((h) => h.date === key);
    return {
      label: d.toLocaleDateString("en", { weekday: "short" }),
      xp: entry?.xp ?? 0,
    };
  });

  // Weakest topic (lowest mastery) for a targeted nudge.
  const weakest = [...course.topics].sort(
    (a, b) => topicMastery(a, statuses) - topicMastery(b, statuses),
  )[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Your progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every level you clear builds real mastery. Here&apos;s how you&apos;re doing.
        </p>
      </div>

      {/* Overview */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="sm:col-span-1">
          <div className="flex flex-col items-center gap-3 p-6">
            <Ring value={completion} size={120} stroke={12} sublabel="course done" />
            <p className="text-center text-sm font-bold text-muted-foreground">
              {course.title}
            </p>
          </div>
        </Card>

        <Card className="sm:col-span-2">
          <div className="p-6">
            <div className="mb-4 flex items-center gap-2 font-bold">
              <TrendingUp className="h-4 w-4 text-primary" /> This week&apos;s activity
            </div>
            <ProgressChart data={days} />
          </div>
        </Card>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat icon={Flame} tone="text-streak" value={`${game.streakDays}d`} label="Streak" />
        <MiniStat icon={Zap} tone="text-xp" value={game.xp} label="Total XP" />
        <MiniStat icon={Trophy} tone="text-primary" value={`${completion}%`} label="Completion" />
        <MiniStat icon={Award} tone="text-success" value={game.badges.length} label="Badges" />
      </div>

      {/* Weak-area nudge */}
      {weakest && (
        <Card className="border-accent/30 bg-accent/5">
          <div className="flex items-center gap-3 p-5">
            <Target className="h-6 w-6 text-accent" />
            <div>
              <p className="font-bold">Focus area: {weakest.title}</p>
              <p className="text-sm text-muted-foreground">
                This is your lowest-mastery topic ({topicMastery(weakest, statuses)}%). A couple of
                levels here will boost your overall score fast.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Topic breakdown */}
      <Card>
        <div className="p-6">
          <h2 className="font-bold">Topic breakdown</h2>
          <div className="mt-4 space-y-5">
            {course.topics.map((t) => (
              <div key={t.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-bold">{t.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {topicMastery(t, statuses)}%
                  </span>
                </div>
                <Progress value={topicMastery(t, statuses)} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.levels.map((l) => {
                    const s = statuses[l.id]?.status ?? "locked";
                    return (
                      <span
                        key={l.id}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          s === "passed"
                            ? "bg-success-soft text-success"
                            : s === "locked"
                              ? "bg-surface-muted text-muted-foreground"
                              : "bg-primary-soft text-primary"
                        }`}
                      >
                        {l.title}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Badge gallery */}
      <Card>
        <div className="p-6">
          <h2 className="font-bold">Badge collection</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ALL_BADGES.map((b) => {
              const earned = game.badges.includes(b);
              return (
                <div
                  key={b}
                  className={`flex items-center gap-2 rounded-lg border p-3 ${
                    earned ? "bg-surface" : "opacity-50"
                  }`}
                >
                  <Award className={`h-6 w-6 ${earned ? "text-accent" : "text-muted-foreground"}`} />
                  <span className="text-sm font-bold">{b}</span>
                </div>
              );
            })}
          </div>
          {game.badges.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Clear levels and ace quizzes to unlock these badges.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: React.ReactNode;
  label: string;
  tone: string;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-1 p-4 text-center">
        <Icon className={`h-6 w-6 ${tone}`} />
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}
