import { cn } from "@/lib/cn";

type PanelOptions = {
  variant?: "solid" | "glass";
  hover?: boolean;
};

/**
 * Karten-Shell-Klassen als String-Helper — für Fälle, in denen das Panel
 * selbst ein anderes Element ist (z. B. ein Link als Grid-Card).
 */
export function panelClasses({
  variant = "solid",
  hover = false,
}: PanelOptions = {}): string {
  return cn(
    "rounded-lg border",
    variant === "solid" && "border-bg-nebula-2 bg-bg-nebula",
    variant === "glass" && "border-glass-border bg-glass backdrop-blur-md",
    hover &&
      "transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-cyan hover:shadow-glow-sm",
  );
}

export function Panel({
  variant,
  hover,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & PanelOptions) {
  return (
    <div
      className={cn(panelClasses({ variant, hover }), className)}
      {...props}
    />
  );
}
