import { headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { listFavorites } from "@/features/favorites/favorites.repository";
import { ExplorerFilters } from "@/features/home/ExplorerFilters";
import { ExplorerTable } from "@/features/home/ExplorerTable";
import { HomeBento } from "@/features/home/HomeBento";
import { HomePage } from "@/features/home/HomePage";
import { findExplorerRows } from "@/features/home/explorer.service";
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
  const [rows, favorites, showcase, locationCount, loadoutCount] =
    await Promise.all([
      findExplorerRows(db, filters),
      userId ? listFavorites(db, userId) : Promise.resolve([]),
      findLoadoutShowcase(db),
      countCelestialBodies(db),
      countPublicLoadouts(db),
    ]);
  const favoriteKeys = new Set(
    favorites.map((favorite) => `${favorite.systemCode}|${favorite.bodySlug}`),
  );

  return (
    <PageShell width="wide">
      <HomePage />
      <HomeBento
        showcase={showcase}
        oreCount={ores.length}
        locationCount={locationCount}
        loadoutCount={loadoutCount}
        currentPatchVersion={CURRENT_PATCH_VERSION}
        viewerUserId={userId}
      />
      <ExplorerFilters ores={ores} />
      <ExplorerTable
        rows={rows}
        favoriteKeys={favoriteKeys}
        isAuthenticated={userId !== null}
      />
    </PageShell>
  );
}
