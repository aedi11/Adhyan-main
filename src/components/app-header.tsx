"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronDown, LogOut, Menu, Moon, Sun, UserRound, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/account-actions";

export interface HeaderLink {
  href: string;
  label: string;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Navy top navigation used across the signed-in app (student + teacher). */
export function AppHeader({
  links,
  user,
}: {
  links: HeaderLink[];
  user: { name: string; email: string; meta: string };
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-30 bg-nav text-nav-foreground shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Brand href="/dashboard" tone="light" />

        <nav className="hidden h-full items-stretch gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "relative flex items-center px-3 text-sm font-medium transition-colors",
                isActive(l.href) ? "text-white" : "text-nav-muted hover:text-white",
              )}
            >
              {l.label}
              {isActive(l.href) && (
                <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-accent" />
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            aria-label="Toggle colour theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-nav-muted hover:bg-white/10 hover:text-white sm:flex"
          >
            <Sun className="hidden h-[18px] w-[18px] dark:block" />
            <Moon className="h-[18px] w-[18px] dark:hidden" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-white/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                {initials(user.name) || <UserRound className="h-4 w-4" />}
              </span>
              <span className="hidden max-w-[140px] truncate text-sm font-medium sm:block">
                {user.name}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-nav-muted sm:block" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border bg-surface text-foreground shadow-lg"
              >
                <div className="border-b px-4 py-3">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  {user.meta && <p className="mt-1 text-xs text-muted-foreground">{user.meta}</p>}
                </div>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-muted"
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground" /> Log out
                  </button>
                </form>
              </div>
            )}
          </div>

          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-white/10 px-4 py-2 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-sm font-medium",
                isActive(l.href) ? "bg-white/10 text-white" : "text-nav-muted",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
