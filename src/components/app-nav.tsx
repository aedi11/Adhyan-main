"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, LayoutDashboard, Library, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/config";

const links = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/learn", label: "Courses", icon: Library },
];

export function AppNav({ xp, streak }: { xp: number; streak: number }) {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <span className="leading-none">
              <span className="block text-lg font-extrabold tracking-tight">{BRAND_NAME}</span>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {BRAND_TAGLINE}
              </span>
            </span>
          </Link>

          <nav className="hidden gap-1 sm:flex">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-surface-muted",
                  )}
                >
                  <l.icon className="h-4 w-4" /> {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-streak/15 px-3 py-1.5 text-sm font-extrabold text-streak">
              <Flame className="h-4 w-4" /> {streak}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-xp/15 px-3 py-1.5 text-sm font-extrabold text-xp">
              <Zap className="h-4 w-4" /> {xp}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-1.5">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-xs font-bold transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <l.icon className="h-5 w-5" /> {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
