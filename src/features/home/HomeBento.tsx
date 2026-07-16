import { useTranslations } from "next-intl";
import { LoadoutCard } from "@/features/loadouts/LoadoutCard";
import { CtaTile } from "./CtaTile";
import { FeatureLoadoutTile } from "./FeatureLoadoutTile";
import type {
  LoadoutShowcase,
  ShowcaseLoadout,
} from "./loadout-showcase.service";
import { StatsTile } from "./StatsTile";

/**
 * Bento-Sektion der Startseite: Feature-Loadout, Datenbank-Stats, CTA und
 * die Top-/Neueste-Listen. Mobil ein einspaltiger Stapel (DOM-Reihenfolge),
 * ab md: 2 Spalten, ab lg: 4 Spalten mit Spans. Fehlen öffentliche Loadouts,
 * bleiben nur Stats + CTA — die CTA-Kachel ist zugleich der Empty-State.
 */
export function HomeBento({
  showcase,
  oreCount,
  locationCount,
  blueprintCount,
  loadoutCount,
  currentPatchVersion,
  viewerUserId,
}: {
  showcase: LoadoutShowcase;
  oreCount: number;
  locationCount: number;
  blueprintCount: number;
  loadoutCount: number;
  currentPatchVersion: string;
  viewerUserId: string | null;
}) {
  const t = useTranslations("home.bento");

  const renderCard = ({
    loadout,
    vehicleName,
    laserSummary,
  }: ShowcaseLoadout) => (
    <LoadoutCard
      key={loadout.id}
      loadout={loadout}
      vehicleName={vehicleName}
      laserSummary={laserSummary}
      currentPatchVersion={currentPatchVersion}
      viewerUserId={viewerUserId}
    />
  );

  return (
    <section
      aria-labelledby="home-bento-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="home-bento-heading" className="text-lg font-medium">
        {t("heading")}
      </h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {showcase.feature && (
          <div
            className="animate-reveal md:col-span-2 lg:row-span-2"
            style={{ animationDelay: "0ms" }}
          >
            <FeatureLoadoutTile
              loadout={showcase.feature.loadout}
              vehicleName={showcase.feature.vehicleName}
              laserSummary={showcase.feature.laserSummary}
              currentPatchVersion={currentPatchVersion}
              viewerUserId={viewerUserId}
            />
          </div>
        )}

        <div
          className="animate-reveal lg:col-span-2"
          style={{ animationDelay: "40ms" }}
        >
          <StatsTile
            oreCount={oreCount}
            locationCount={locationCount}
            blueprintCount={blueprintCount}
            loadoutCount={loadoutCount}
          />
        </div>

        <div
          className="animate-reveal lg:col-span-2"
          style={{ animationDelay: "80ms" }}
        >
          <CtaTile />
        </div>

        {showcase.top.length > 0 && (
          <div
            className="animate-reveal flex flex-col gap-3 lg:col-span-2"
            style={{ animationDelay: "120ms" }}
          >
            <h3 className="text-sm font-medium text-text-muted">
              {t("topHeading")}
            </h3>
            {showcase.top.map(renderCard)}
          </div>
        )}

        {showcase.newest.length > 0 && (
          <div
            className="animate-reveal flex flex-col gap-3 lg:col-span-2"
            style={{ animationDelay: "160ms" }}
          >
            <h3 className="text-sm font-medium text-text-muted">
              {t("newestHeading")}
            </h3>
            {showcase.newest.map(renderCard)}
          </div>
        )}
      </div>
    </section>
  );
}
