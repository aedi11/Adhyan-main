import { AppNav } from "@/components/app-nav";
import { getGamification } from "@/lib/data/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const game = getGamification();
  return (
    <div className="min-h-full">
      <AppNav xp={game.xp} streak={game.streakDays} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:pb-10">{children}</main>
    </div>
  );
}
