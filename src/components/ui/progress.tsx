import * as React from "react";
import { cn, clamp } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  tone?: "primary" | "success" | "xp";
}

const tones: Record<string, string> = {
  primary: "bg-primary",
  success: "bg-success",
  xp: "bg-xp",
};

export function Progress({ value, tone = "primary", className, ...props }: ProgressProps) {
  const pct = clamp(value, 0, 100);
  return (
    <div
      className={cn("h-3 w-full overflow-hidden rounded-full bg-surface-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
