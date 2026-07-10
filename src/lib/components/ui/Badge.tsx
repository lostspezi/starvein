import { cn } from "@/lib/cn";

const TONE_CLASS = {
  default: "text-text-muted",
  success: "text-success",
  warning: "text-warning",
} as const;

export function Badge({
  tone = "default",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span"> & {
  tone?: keyof typeof TONE_CLASS;
}) {
  return (
    <span
      className={cn(
        "rounded bg-bg-nebula-2 px-1.5 py-0.5 text-xs",
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    />
  );
}
