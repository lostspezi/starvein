import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { panelClasses } from "@/lib/components/ui/Panel";
import type { StarSystem } from "./locations.schema";

export function SystemList({ systems }: { systems: StarSystem[] }) {
  const t = useTranslations("locations");

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {systems.map((system, index) => (
        <li
          key={system.code}
          className="animate-reveal"
          style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
        >
          <Link
            href={`/locations/${system.code.toLowerCase()}`}
            className={cn(panelClasses({ hover: true }), "block px-4 py-4")}
          >
            <span className="block text-lg font-semibold">{system.name}</span>
            <span className="block text-sm text-text-muted">
              {t("systemSuffix")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
