import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0_6px_0_0_color-mix(in_srgb,var(--color-primary)_55%,black)] hover:brightness-105 active:translate-y-[3px] active:shadow-[0_3px_0_0_color-mix(in_srgb,var(--color-primary)_55%,black)]",
        accent:
          "bg-accent text-accent-foreground shadow-[0_6px_0_0_color-mix(in_srgb,var(--color-accent)_55%,black)] hover:brightness-105 active:translate-y-[3px] active:shadow-[0_3px_0_0_color-mix(in_srgb,var(--color-accent)_55%,black)]",
        outline:
          "border-2 border-border bg-surface text-foreground hover:border-primary/40 hover:bg-surface-muted",
        ghost: "text-foreground hover:bg-surface-muted",
        success:
          "bg-success text-white shadow-[0_6px_0_0_color-mix(in_srgb,var(--color-success)_55%,black)] active:translate-y-[3px] active:shadow-[0_3px_0_0_color-mix(in_srgb,var(--color-success)_55%,black)]",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
