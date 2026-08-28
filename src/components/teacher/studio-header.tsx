import Link from "next/link";
import { ChevronLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND_TAGLINE } from "@/lib/config";

/** Shared Teacher Studio top bar. `back` sets where the chevron links. */
export function StudioHeader({ back = "/" }: { back?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link
            href={back}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-extrabold">Teacher Studio</span>
            <span className="hidden text-xs font-bold text-muted-foreground sm:inline">
              · {BRAND_TAGLINE}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">Student view</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
