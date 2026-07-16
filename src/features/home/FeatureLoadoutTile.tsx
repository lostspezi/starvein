import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import { VoteButton } from "@/features/loadouts/VoteButton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { Badge } from "@/lib/components/ui/Badge";
import { panelClasses } from "@/lib/components/ui/Panel";

/**
 * Große Bento-Kachel für das höchstbewertete Loadout — wie LoadoutCard,
 * aber mit Featured-Label, größerem Titel und optionaler Beschreibung.
 */
export function FeatureLoadoutTile({
  loadout,
  vehicleName,
  laserSummary,
  currentPatchVersion,
  viewerUserId,
}: {
  loadout: Loadout;
  vehicleName: string;
  laserSummary: string;
  currentPatchVersion: string;
  viewerUserId: string | null;
}) {
  const t = useTranslations("home.loadouts");
  const tLoadouts = useTranslations("loadouts");
  const isOwner = viewerUserId !== null && viewerUserId === loadout.ownerUserId;

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
        <Badge>{tLoadouts(`method.${loadout.method}`)}</Badge>
      </div>

      <Link
        href={`/loadouts/${loadout.id}`}
        className="text-xl font-medium text-text-primary transition-colors duration-150 hover:text-accent-glow"
      >
        {loadout.name}
      </Link>

      {loadout.description && (
        <p className="line-clamp-2 text-sm text-text-muted">
          {loadout.description}
        </p>
      )}

      <p className="text-sm text-text-muted">
        {vehicleName}
        {laserSummary && (
          <>
            {" · "}
            <span className="font-mono text-xs">{laserSummary}</span>
          </>
        )}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {loadout.patchVersion !== currentPatchVersion ? (
          <Badge tone="warning">
            {tLoadouts("card.outdated", { patchVersion: loadout.patchVersion })}
          </Badge>
        ) : (
          <span />
        )}
        <VoteButton
          loadoutId={loadout.id}
          initialVotes={loadout.votes.up}
          initialHasVoted={
            viewerUserId !== null && loadout.voters.includes(viewerUserId)
          }
          isOwner={isOwner}
        />
      </div>
    </article>
  );
}
