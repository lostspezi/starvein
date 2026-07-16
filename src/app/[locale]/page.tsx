import { headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { countBlueprints } from "@/features/blueprints/blueprints.repository";
import { listFavorites } from "@/features/favorites/favorites.repository";
import type { GuideLanguage } from "@/features/guides/guides.languages";
import { countPublicGuides } from "@/features/guides/guides.repository";
import { CtaTile } from "@/features/home/CtaTile";
import { ExplorerFilters } from "@/features/home/ExplorerFilters";
import { findGuideShowcase } from "@/features/home/guide-showcase.service";
import { GuideShowcasePanel } from "@/features/home/GuideShowcasePanel";
import { HomePage } from "@/features/home/HomePage";
import { LoadoutShowcasePanel } from "@/features/home/LoadoutShowcasePanel";
import { QuickLinksTile } from "@/features/home/QuickLinksTile";
import { StatsTile } from "@/features/home/StatsTile";
import { TopOccurrencesWidget } from "@/features/home/TopOccurrencesWidget";
import { findTopOreRows } from "@/features/home/explorer.service";
import { findLoadoutShowcase } from "@/features/home/loadout-showcase.service";
import { countCelestialBodies } from "@/features/locations/locations.repository";
import { SYSTEM_CODES } from "@/features/locations/locations.schema";
import { countPublicLoadouts } from "@/features/loadouts/loadouts.repository";
import { findAllOres } from "@/features/ores/ores.repository";
import {
  MINING_METHODS,
  RARITY_TIERS,
  type MiningMethod,
  type RarityTier,
} from "@/features/ores/ores.schema";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { parseEnumParam } from "@/lib/search-params";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Startseite als breites Dashboard (PageShell "xl"): Hero mit Willkommenstext
 * und Stats, Loadouts + Guides nebeneinander, darunter das kompakte
 * Vorkommen-Widget mit CTA und Schnelleinstieg. Die volle Vorkommen-Tabelle
 * lebt auf /occurrences.
 */
export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const db = await getDb();
  const ores = await findAllOres(db);

  const sp = await searchParams;
  const oreParam = typeof sp.ore === "string" ? sp.ore : null;
  const filters = {
    method: parseEnumParam<MiningMethod>(sp.method, MINING_METHODS),
    system: parseEnumParam(sp.system, SYSTEM_CODES),
    rarity: parseEnumParam<RarityTier>(sp.rarity, RARITY_TIERS),
    ore: ores.some((ore) => ore.code === oreParam) ? oreParam : null,
  };

  const userId = await getSessionUserId(await headers());
  const [
    topOres,
    favorites,
    loadoutShowcase,
    guideShowcase,
    locationCount,
    blueprintCount,
    loadoutCount,
    guideCount,
  ] = await Promise.all([
    findTopOreRows(db, filters),
    userId ? listFavorites(db, userId) : Promise.resolve([]),
    findLoadoutShowcase(db),
    findGuideShowcase(db),
    countCelestialBodies(db),
    countBlueprints(db),
    countPublicLoadouts(db),
    countPublicGuides(db),
  ]);
  const favoriteKeys = new Set(
    favorites.map((favorite) => `${favorite.systemCode}|${favorite.bodySlug}`),
  );

  return (
    <PageShell width="xl" className="gap-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr] lg:gap-6">
        <HomePage />
        <div className="animate-reveal" style={{ animationDelay: "80ms" }}>
          <StatsTile
            oreCount={ores.length}
            locationCount={locationCount}
            blueprintCount={blueprintCount}
            communityCount={loadoutCount + guideCount}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LoadoutShowcasePanel
          showcase={loadoutShowcase}
          currentPatchVersion={CURRENT_PATCH_VERSION}
          viewerUserId={userId}
        />
        <GuideShowcasePanel
          showcase={guideShowcase}
          language={locale as GuideLanguage}
          viewerUserId={userId}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <TopOccurrencesWidget
          rows={topOres.rows}
          total={topOres.total}
          favoriteKeys={favoriteKeys}
          isAuthenticated={userId !== null}
        >
          <ExplorerFilters ores={ores} />
        </TopOccurrencesWidget>
        <div className="flex flex-col gap-4">
          <CtaTile />
          <QuickLinksTile />
        </div>
      </div>
    </PageShell>
  );
}
