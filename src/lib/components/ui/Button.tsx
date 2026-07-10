"use client";

import { cn } from "@/lib/cn";

const VARIANT_CLASS = {
  primary:
    "bg-accent-primary font-medium text-bg-void hover:bg-accent-glow hover:shadow-glow-primary",
  ghost: "text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary",
} as const;

export function Button({
  variant = "primary",
  type = "button",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  variant?: keyof typeof VARIANT_CLASS;
}) {
  return (
    <button
      type={type}
      className={cn(
        "rounded px-3 py-1.5 text-sm transition-all duration-200 disabled:opacity-50",
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    />
  );
}
