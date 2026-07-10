import { cn } from "@/lib/cn";
import { panelClasses } from "./Panel";

/** Tabellen-Shell: horizontal scrollbares Panel um eine volle Breite-Tabelle. */
export function DataTable({
  className,
  containerClassName,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"table"> & { containerClassName?: string }) {
  return (
    <div className={cn("overflow-x-auto", panelClasses(), containerClassName)}>
      <table className={cn("w-full text-left text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function DataTableHead({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"tr">) {
  return (
    <thead>
      <tr
        className={cn("border-b border-bg-nebula-2 text-text-muted", className)}
        {...props}
      >
        {children}
      </tr>
    </thead>
  );
}

export function DataTableRow({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-bg-nebula-2 transition-colors duration-150 last:border-b-0 hover:bg-bg-nebula-2",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableTh({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"th">) {
  return <th className={cn("px-4 py-3 font-medium", className)} {...props} />;
}

export function DataTableTd({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"td">) {
  return <td className={cn("px-4 py-3", className)} {...props} />;
}
