import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { GuideVoteButton } from "@/features/guides/GuideVoteButton";
import type { GuideLanguage } from "@/features/guides/guides.languages";
import {
  pickGuideTranslation,
  type Guide,
} from "@/features/guides/guides.schema";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { Badge } from "@/lib/components/ui/Badge";
import { panelClasses } from "@/lib/components/ui/Panel";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";

/**
 * Große Kachel für den höchstbewerteten Guide — wie GuideCard, aber mit
 * Featured-Label, größerem Titel und Beschreibung (Gegenstück zur
 * FeatureLoadoutTile).
 */
export function FeatureGuideTile({
  guide,
  language,
  viewerUserId,
}: {
  guide: Guide;
  language: GuideLanguage;
  viewerUserId: string | null;
}) {
  const t = useTranslations("home.guides");
  const tGuides = useTranslations("guides");
  const translation = pickGuideTranslation(guide, language);
  const isOwner = viewerUserId !== null && viewerUserId === guide.ownerUserId;
  const outdated = guide.patchVersion !== CURRENT_PATCH_VERSION;

  return (
    <article
      className={cn(
        panelClasses({ hover: true }),
        "flex h-full flex-col gap-3 p-4 sm:p-5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm text-accent-ice">
          <Trophy aria-hidden="true" className="size-5" />
          {t("featured")}
        </span>
      </div>

      <Link
        href={`/guides/${guide.id}`}
        className="text-xl font-medium text-text-primary transition-colors duration-150 hover:text-accent-glow"
      >
        {translation.title}
      </Link>

      {translation.description && (
        <p className="line-clamp-2 text-sm text-text-muted">
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
            {tGuides("card.outdated", { patchVersion: guide.patchVersion })}
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
