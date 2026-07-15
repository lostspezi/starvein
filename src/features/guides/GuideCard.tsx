import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/lib/components/ui/Badge";
import { panelClasses } from "@/lib/components/ui/Panel";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import type { Guide } from "./guides.schema";

/** Kompakte Guide-Karte für Listen-/Übersichtsseiten. */
export async function GuideCard({ guide }: { guide: Guide }) {
  const t = await getTranslations("guides");
  const outdated = guide.patchVersion !== CURRENT_PATCH_VERSION;

  return (
    <Link
      href={`/guides/${guide.id}`}
      className={`${panelClasses({ hover: true })} flex flex-col gap-2 p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-medium transition-colors duration-150 hover:text-accent-glow">
          {guide.title}
        </h2>
        {outdated && (
          <Badge tone="warning">
            {t("card.outdated", { patchVersion: guide.patchVersion })}
          </Badge>
        )}
      </div>
      {guide.description && (
        <p className="line-clamp-3 text-sm text-text-muted">
          {guide.description}
        </p>
      )}
      {guide.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {guide.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      )}
    </Link>
  );
}
