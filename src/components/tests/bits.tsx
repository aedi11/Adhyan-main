import { cn } from "@/lib/utils";
import type { Proficiency } from "@/lib/server/tests";

export const PROFICIENCY_STYLE: Record<Proficiency, string> = {
  Strong: "bg-success-soft text-success",
  Average: "bg-warning-soft text-warning",
  Weak: "bg-danger-soft text-danger",
  "Not attempted": "bg-surface-muted text-muted-foreground",
};

export const PROFICIENCY_BAR: Record<Proficiency, string> = {
  Strong: "bg-success",
  Average: "bg-accent",
  Weak: "bg-danger",
  "Not attempted": "bg-border",
};

export function ProficiencyBadge({ level }: { level: Proficiency }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", PROFICIENCY_STYLE[level])}>
      {level}
    </span>
  );
}

/** Thin horizontal meter (0–100). */
export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className={cn("h-full rounded-full", className ?? "bg-primary")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return m ? `${h}h ${m}m` : `${h} hours`.replace(/^1 hours/, "1 hour");
  if (m) return s ? `${m}m ${s.toString().padStart(2, "0")}s` : `${m} min`;
  return `${s}s`;
}
