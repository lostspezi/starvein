import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/lib/components/ui/Badge";
import { panelClasses } from "@/lib/components/ui/Panel";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { GUIDE_LANGUAGE_NAMES, type GuideLanguage } from "./guides.languages";
import { pickGuideTranslation, type Guide } from "./guides.schema";

/**
 * Kompakte Guide-Karte. Zeigt die Sprachversion für `language` (mit Fallback);
 * weicht die gezeigte Sprache ab, wird sie als Badge kenntlich gemacht.
 */
export async function GuideCard({
  guide,
  language,
}: {
  guide: Guide;
  language: GuideLanguage;
}) {
  const t = await getTranslations("guides");
  const translation = pickGuideTranslation(guide, language);
  const isFallback = translation.language !== language;
  const outdated = guide.patchVersion !== CURRENT_PATCH_VERSION;

  return (
    <Link
      href={`/guides/${guide.id}`}
      className={`${panelClasses({ hover: true })} flex flex-col gap-2 p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-medium transition-colors duration-150 hover:text-accent-glow">
          {translation.title}
        </h2>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isFallback && (
            <Badge>{GUIDE_LANGUAGE_NAMES[translation.language]}</Badge>
          )}
          {outdated && (
            <Badge tone="warning">
              {t("card.outdated", { patchVersion: guide.patchVersion })}
            </Badge>
          )}
        </div>
      </div>
      {translation.description && (
        <p className="line-clamp-3 text-sm text-text-muted">
          {translation.description}
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
