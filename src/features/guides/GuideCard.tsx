import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/lib/components/ui/Badge";
import { panelClasses } from "@/lib/components/ui/Panel";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { GuideVoteButton } from "./GuideVoteButton";
import { GUIDE_LANGUAGE_NAMES, type GuideLanguage } from "./guides.languages";
import { pickGuideTranslation, type Guide } from "./guides.schema";

/**
 * Kompakte Guide-Karte. Zeigt die Sprachversion für `language` (mit Fallback);
 * weicht die gezeigte Sprache ab, wird sie als Badge kenntlich gemacht.
 * Titel verlinkt aufs Detail, Upvote-Toggle im Footer (außerhalb des Links).
 */
export function GuideCard({
  guide,
  language,
  viewerUserId,
}: {
  guide: Guide;
  language: GuideLanguage;
  viewerUserId: string | null;
}) {
  const t = useTranslations("guides");
  const translation = pickGuideTranslation(guide, language);
  const isFallback = translation.language !== language;
  const outdated = guide.patchVersion !== CURRENT_PATCH_VERSION;
  const isOwner = viewerUserId !== null && viewerUserId === guide.ownerUserId;

  return (
    <article
      className={`${panelClasses({ hover: true })} flex flex-col gap-2 p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/guides/${guide.id}`}
          className="font-medium text-text-primary transition-colors duration-150 hover:text-accent-glow"
        >
          {translation.title}
        </Link>
        {isFallback && (
          <Badge className="shrink-0">
            {GUIDE_LANGUAGE_NAMES[translation.language]}
          </Badge>
        )}
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
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {outdated ? (
          <Badge tone="warning">
            {t("card.outdated", { patchVersion: guide.patchVersion })}
          </Badge>
        ) : (
          <span />
        )}
        <GuideVoteButton
          guideId={guide.id}
          initialVotes={guide.votes.up}
          initialHasVoted={
            viewerUserId !== null && guide.voters.includes(viewerUserId)
          }
          isOwner={isOwner}
        />
      </div>
    </article>
  );
}
