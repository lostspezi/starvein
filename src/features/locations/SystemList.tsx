import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StarSystem } from "./locations.schema";

export function SystemList({ systems }: { systems: StarSystem[] }) {
  const t = useTranslations("locations");

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {systems.map((system) => (
        <li key={system.code}>
          <Link
            href={`/locations/${system.code.toLowerCase()}`}
            className="block rounded-lg border border-bg-nebula-2 bg-bg-nebula px-4 py-4 hover:border-accent-primary"
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
