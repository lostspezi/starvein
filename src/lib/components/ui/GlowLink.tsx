import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** Locale-bewusster Link im Standard-Datenlink-Stil mit Glow-Hover. */
export function GlowLink({
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "text-accent-primary transition-colors duration-150 hover:text-accent-glow hover:underline",
        className,
      )}
      {...props}
    />
  );
}
