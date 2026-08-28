import Link from "next/link";
import {
  ArrowRight,
  Flame,
  Lock,
  Shuffle,
  Sparkles,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Shuffle,
    title: "Every quiz is unique",
    body: "Our engine reshapes each question per student — same concept, fresh numbers and format. No two attempts are alike.",
  },
  {
    icon: Lock,
    title: "Your effort, protected",
    body: "Answers are graded on our servers and never exposed. Course content stays safe — for you and your teachers.",
  },
  {
    icon: Timer,
    title: "Beat the clock",
    body: "Timed level challenges build real exam speed. Pass the threshold to unlock the next level.",
  },
  {
    icon: Flame,
    title: "Streaks & XP",
    body: "Earn XP, keep your streak alive, collect badges. Studying that actually feels rewarding.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="leading-none">
            <span className="block text-xl font-extrabold tracking-tight">Adhyan</span>
            <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Enhanced Learning
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/teacher">For Teachers</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard">Open app</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto w-full max-w-6xl px-5 pt-10 pb-16 sm:pt-16">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute top-20 right-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="primary" className="mb-5 animate-pop-in">
            <Zap className="h-3.5 w-3.5" /> Built for college students
          </Badge>
          <h1 className="text-balance text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Learn. Level up. <span className="text-primary">Repeat.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            Adhyan turns exam prep into a game. Climb through topics level by
            level, race the timer, and watch your mastery grow — with questions
            that adapt to you every single time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/dashboard">
                Start learning free <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/learn">Explore a course</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            7-day free trial · No card required · ₹299/mo per course after
          </p>
        </div>

        {/* Hero stat band */}
        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-4">
          {[
            { icon: Trophy, label: "Levels to conquer", value: "6+" },
            { icon: Shuffle, label: "Question variants", value: "∞" },
            { icon: Flame, label: "Avg. daily streak", value: "12d" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border bg-surface p-4 text-center shadow-sm"
            >
              <s.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-20">
        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">
          Why students stick with Adhyan
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex gap-4 rounded-lg border bg-surface p-6 shadow-sm transition-transform hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <f.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-white/10" />
          <h2 className="relative text-3xl font-black">Your next level is waiting.</h2>
          <p className="relative mx-auto mt-3 max-w-md text-primary-foreground/90">
            Join thousands of students turning study sessions into win streaks.
          </p>
          <Button asChild size="lg" variant="accent" className="relative mt-7">
            <Link href="/dashboard">
              Jump in <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="mt-auto border-t py-8">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Adhyan · Made for curious minds
        </p>
      </footer>
    </div>
  );
}
