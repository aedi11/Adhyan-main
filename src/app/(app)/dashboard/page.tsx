import Link from "next/link";
import {
  Award,
  ChevronRight,
  Compass,
  Flame,
  Library,
  ListChecks,
  Play,
  Sparkles,
  Target,
  Trophy,
  Wand2,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ring } from "@/components/ui/ring";
import { Progress } from "@/components/ui/progress";
import {
  getActiveCourseId,
  getCatalog,
  getCompletion,
  getCourse,
  getGamification,
  getStatuses,
  getTestResults,
  isPlaced,
} from "@/lib/data/store";
import { nextActionableLevel, topicMastery } from "@/lib/domain/progression";
import { APP_MODE, BRAND_TAGLINE } from "@/lib/config";

export default function DashboardPage() {
  return APP_MODE === "tests" ? <TestsDashboard /> : <LevelsDashboard />;
}

// ───────────────────────── Tests-mode dashboard ─────────────────────────
function TestsDashboard() {
  const game = getGamification();
  const catalog = getCatalog();
  const results = getTestResults();

  const totalTests = catalog.reduce((a, c) => a + c.testCount, 0);
  const completedCount = Object.keys(results).length;
  const percents = Object.values(results).map((r) => r.bestPercent);
  const avgBest = percents.length
    ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
    : 0;
  const featured = catalog[0]; // ELL 1000

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="primary" className="mb-2">
          <Sparkles className="h-3.5 w-3.5" /> {BRAND_TAGLINE}
        </Badge>
        <h1 className="text-3xl font-black tracking-tight">Ready for your next test?</h1>
        <p className="mt-1 text-sm font-bold text-muted-foreground">
          {catalog.length} courses · {totalTests} tests available
        </p>
      </div>

      {/* Hero */}
      <Card className="overflow-hidden border-0 bg-primary text-primary-foreground">
        <div className="relative p-6">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          {completedCount === 0 ? (
            <Onboard
              badge="Get started"
              title={featured.title}
              subtitle="Browse courses and take a timed test — 100 questions each, graded on our servers."
              href="/learn"
              cta="Browse courses"
              icon={<Library className="h-5 w-5" />}
            />
          ) : (
            <Onboard
              badge={`${completedCount}/${totalTests} tests done`}
              title="Keep your streak going"
              subtitle="Jump back into a course and take your next test, or retake one to beat your best."
              href="/learn"
              cta="Go to courses"
              icon={<Play className="h-5 w-5" />}
            />
          )}
        </div>
      </Card>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Flame} tone="text-streak" value={`${game.streakDays}d`} label="Streak" />
        <StatCard icon={Zap} tone="text-xp" value={game.xp} label="Total XP" />
        <StatCard icon={ListChecks} tone="text-primary" value={`${completedCount}/${totalTests}`} label="Tests done" />
        <StatCard icon={Target} tone="text-success" value={`${avgBest}%`} label="Avg best" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Courses summary */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 font-bold">
              <Library className="h-5 w-5 text-primary" /> Your courses
            </div>
            <div className="mt-4 space-y-2">
              {catalog.map((c) => (
                <Link
                  key={c.id}
                  href={`/learn/${c.id}`}
                  className="flex items-center justify-between rounded-lg border bg-surface p-3 transition-colors hover:border-primary/40"
                >
                  <span className="text-sm font-bold">{c.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.testCount} test{c.testCount === 1 ? "" : "s"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Card>

        {/* Badges */}
        <Card>
          <div className="p-6">
            <h3 className="font-bold">Your badges</h3>
            {game.badges.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {game.badges.map((b) => (
                  <Badge key={b} variant="accent" className="px-3 py-1.5">
                    <Award className="h-3.5 w-3.5" /> {b}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No badges yet — finish a test to earn one!
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ───────────────────────── Level-mode dashboard (paused) ─────────────────────────
function LevelsDashboard() {
  const game = getGamification();
  const activeCourseId = getActiveCourseId();
  const course = getCourse(activeCourseId ?? undefined);
  const statuses = getStatuses(course.id);
  const completion = getCompletion(course.id);
  const placed = activeCourseId ? isPlaced(course.id) : false;
  const next = nextActionableLevel(course, statuses);

  const dailyGoalXp = 60;
  const todayXp = Math.min(game.xp % 120, dailyGoalXp);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-muted-foreground">Welcome back 👋</p>
        <h1 className="text-3xl font-black tracking-tight">Ready to level up?</h1>
      </div>

      {/* Continue / onboarding hero */}
      <Card className="overflow-hidden border-0 bg-primary text-primary-foreground">
        <div className="relative p-6">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />

          {!activeCourseId ? (
            <Onboard
              badge="Get started"
              title="Find your course"
              subtitle="Browse the catalog, start a free trial, and we'll place you at the right level."
              href="/learn"
              cta="Browse courses"
              icon={<Compass className="h-5 w-5" />}
            />
          ) : !placed ? (
            <Onboard
              badge={course.title}
              title="Take your placement test"
              subtitle="10 quick questions to find your starting level — skip what you already know."
              href={`/learn/${course.id}`}
              cta="Start placement test"
              icon={<Wand2 className="h-5 w-5" />}
            />
          ) : next ? (
            <Onboard
              badge={course.title}
              title={`${next.topic.title} · ${next.level.title}`}
              subtitle={`Pass ${next.level.passThreshold}% to unlock the next level · ${Math.round(next.level.timeLimitSec / 60)} min timer`}
              href={`/learn/${course.id}`}
              cta="Continue learning"
              icon={<Play className="h-5 w-5" />}
            />
          ) : (
            <Onboard
              badge={course.title}
              title="Course complete! 🎉"
              subtitle="You've mastered every level. Revisit topics to keep your streak alive."
              href={`/learn/${course.id}`}
              cta="Review topics"
              icon={<Sparkles className="h-5 w-5" />}
            />
          )}
        </div>
      </Card>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Flame} tone="text-streak" value={`${game.streakDays}d`} label="Streak" />
        <StatCard icon={Zap} tone="text-xp" value={game.xp} label="Total XP" />
        <StatCard icon={Trophy} tone="text-primary" value={`${completion}%`} label="Course done" />
        <StatCard icon={Award} tone="text-success" value={game.badges.length} label="Badges" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Daily goal */}
        <Card>
          <div className="flex items-center gap-4 p-6">
            <Ring value={(todayXp / dailyGoalXp) * 100} label={`${todayXp}`} sublabel="/ 60 XP" />
            <div>
              <div className="flex items-center gap-2 font-bold">
                <Target className="h-4 w-4 text-primary" /> Daily goal
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {todayXp >= dailyGoalXp
                  ? "Smashed it! Come back tomorrow to keep the streak."
                  : `${dailyGoalXp - todayXp} XP to go. One quick level does it.`}
              </p>
            </div>
          </div>
        </Card>

        {/* Topic mastery */}
        <Card>
          <div className="p-6">
            <h3 className="font-bold">{course.title} mastery</h3>
            <div className="mt-4 space-y-4">
              {course.topics.map((t) => (
                <div key={t.id}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold">{t.title}</span>
                    <span className="text-muted-foreground">{topicMastery(t, statuses)}%</span>
                  </div>
                  <Progress value={topicMastery(t, statuses)} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Badges */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Your badges</h3>
            <Link
              href="/progress"
              className="flex items-center text-sm font-bold text-primary hover:underline"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {game.badges.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {game.badges.map((b) => (
                <Badge key={b} variant="accent" className="px-3 py-1.5">
                  <Award className="h-3.5 w-3.5" /> {b}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No badges yet — clear your first level to earn one!
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function Onboard({
  badge,
  title,
  subtitle,
  href,
  cta,
  icon,
}: {
  badge: string;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
  icon: React.ReactNode;
}) {
  return (
    <>
      <Badge className="bg-white/20 text-white">
        <Sparkles className="h-3.5 w-3.5" /> {badge}
      </Badge>
      <h2 className="relative mt-3 text-2xl font-black">{title}</h2>
      <p className="relative mt-1 text-sm text-primary-foreground/80">{subtitle}</p>
      <Button asChild variant="accent" size="lg" className="relative mt-5">
        <Link href={href}>
          {icon} {cta}
        </Link>
      </Button>
    </>
  );
}

function StatCard({
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
