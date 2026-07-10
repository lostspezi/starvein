import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  subtitle,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("animate-reveal flex flex-col gap-1", className)}>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle ? <p className="text-text-muted">{subtitle}</p> : null}
    </header>
  );
}
