import { CheckCircle2 } from "lucide-react";
import { Brand } from "@/components/brand";

/** Split-screen frame for login / registration. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-nav p-10 text-white lg:flex">
        <Brand tone="light" showTagline />
        <div>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Practise under exam conditions.
            <br />
            Improve with real analysis.
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-nav-muted">
            {[
              "Ten full-length, timed tests covering every syllabus topic",
              "A unique paper for every student, every attempt",
              "Accuracy, percentile and topic-wise strengths after each test",
              "Solutions for every question you answered incorrectly",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-nav-muted">© {new Date().getFullYear()} Adhyan</p>
      </aside>
      <main className="flex flex-col bg-surface">
        <div className="p-6 lg:hidden">
          <Brand />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-lg">{children}</div>
        </div>
      </main>
    </div>
  );
}
