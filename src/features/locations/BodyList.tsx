import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CelestialBody } from "./locations.schema";

export function BodyList({ bodies }: { bodies: CelestialBody[] }) {
  const t = useTranslations("locations");

  if (bodies.length === 0) {
    return <p className="py-6 text-center text-text-muted">{t("empty")}</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bodies.map((body) => (
        <li key={body.slug}>
          <Link
            href={`/locations/${body.systemCode.toLowerCase()}/${body.slug}`}
            className="block rounded-lg border border-bg-nebula-2 bg-bg-nebula px-4 py-3 hover:border-accent-primary"
          >
            <span className="block font-medium">{body.name}</span>
            <span className="block text-sm text-text-muted">
              {t(`bodyType.${body.type}`)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
