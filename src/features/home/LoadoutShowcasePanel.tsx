import { useTranslations } from "next-intl";
import { LoadoutCard } from "@/features/loadouts/LoadoutCard";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { Panel } from "@/lib/components/ui/Panel";
import { FeatureLoadoutTile } from "./FeatureLoadoutTile";
import type { LoadoutShowcase } from "./loadout-showcase.service";

/**
 * Loadout-Sektion der Startseite: das höchstbewertete Loadout als Feature
 * plus die neuesten Einträge — Gegenstück zum GuideShowcasePanel daneben.
 * Ohne öffentliche Loadouts bleibt ein Empty-State-Panel.
 */
export function LoadoutShowcasePanel({
  showcase,
  currentPatchVersion,
  viewerUserId,
}: {
  showcase: LoadoutShowcase;
  currentPatchVersion: string;
  viewerUserId: string | null;
}) {
  const t = useTranslations("home.loadouts");

  return (
    <section
      aria-labelledby="home-loadouts-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="home-loadouts-heading" className="text-lg font-medium">
          {t("heading")}
        </h2>
        <GlowLink href="/loadouts" className="text-sm">
          {t("viewAll")}
        </GlowLink>
      </div>

      {showcase.feature ? (
        <div className="animate-reveal" style={{ animationDelay: "0ms" }}>
          <FeatureLoadoutTile
            loadout={showcase.feature.loadout}
            vehicleName={showcase.feature.vehicleName}
            laserSummary={showcase.feature.laserSummary}
            currentPatchVersion={currentPatchVersion}
            viewerUserId={viewerUserId}
          />
        </div>
      ) : (
        <Panel className="p-4 text-sm text-text-muted">{t("empty")}</Panel>
      )}

      {showcase.newest.length > 0 && (
        <div
          className="animate-reveal flex flex-col gap-3"
          style={{ animationDelay: "40ms" }}
        >
          <h3 className="text-sm font-medium text-text-muted">
            {t("newestHeading")}
          </h3>
          {showcase.newest.map(({ loadout, vehicleName, laserSummary }) => (
            <LoadoutCard
              key={loadout.id}
              loadout={loadout}
              vehicleName={vehicleName}
              laserSummary={laserSummary}
              currentPatchVersion={currentPatchVersion}
              viewerUserId={viewerUserId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
