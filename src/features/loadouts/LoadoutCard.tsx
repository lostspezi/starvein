import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/lib/components/ui/Badge";
import { panelClasses } from "@/lib/components/ui/Panel";
import type { Loadout } from "./loadouts.schema";
import { VoteButton } from "./VoteButton";

/**
 * Karte der Public-Liste: Name verlinkt aufs Detail, Badges für Methode
 * und Patch-Drift, Upvote-Toggle im Footer (außerhalb des Links).
 */
export function LoadoutCard({
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
  const t = useTranslations("loadouts");
  const isOwner = viewerUserId !== null && viewerUserId === loadout.ownerUserId;

  return (
    <article
      className={`${panelClasses({ hover: true })} flex flex-col gap-2 p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/loadouts/${loadout.id}`}
          className="font-medium text-text-primary transition-colors duration-150 hover:text-accent-glow"
        >
          {loadout.name}
        </Link>
        <Badge>{t(`method.${loadout.method}`)}</Badge>
      </div>

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
            {t("card.outdated", { patchVersion: loadout.patchVersion })}
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
