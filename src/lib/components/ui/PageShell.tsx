import { cn } from "@/lib/cn";

const WIDTH_CLASS = {
  default: "max-w-4xl",
  wide: "max-w-5xl",
} as const;

/** Zentrierte Seiten-Spalte — ersetzt den pro Seite kopierten Container-String. */
export function PageShell({
  width = "default",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"main"> & {
  width?: keyof typeof WIDTH_CLASS;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8",
        WIDTH_CLASS[width],
        className,
      )}
      {...props}
    />
  );
}
