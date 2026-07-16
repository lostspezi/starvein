import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listFavorites } from "@/features/favorites/favorites.repository";
import { ExplorerFilters } from "@/features/home/ExplorerFilters";
import { ExplorerTable } from "@/features/home/ExplorerTable";
import { findExplorerRows } from "@/features/home/explorer.service";
import { SYSTEM_CODES } from "@/features/locations/locations.schema";
import { findAllOres } from "@/features/ores/ores.repository";
import {
  MINING_METHODS,
  RARITY_TIERS,
  type MiningMethod,
  type RarityTier,
} from "@/features/ores/ores.schema";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { parseEnumParam } from "@/lib/search-params";
import { getSessionUserId } from "@/lib/session";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: "/occurrences",
    title: t("occurrences.title"),
    description: t("occurrences.description"),
  });
}

/**
 * Die volle Vorkommen-Tabelle (früher Teil der Startseite): alle Vorkommen
 * mit Erz-, System-, Methoden- und Seltenheitsfilter, gekappt auf die
 * Top-200-Zeilen (siehe explorer.service).
 */
export default async function OccurrencesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("occurrences");
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
  const [explorer, favorites] = await Promise.all([
    findExplorerRows(db, filters),
    userId ? listFavorites(db, userId) : Promise.resolve([]),
  ]);
  const favoriteKeys = new Set(
    favorites.map((favorite) => `${favorite.systemCode}|${favorite.bodySlug}`),
  );

  return (
    <PageShell width="wide">
      <PageHeader title={t("page.title")} subtitle={t("page.subtitle")} />
      <ExplorerFilters ores={ores} />
      <ExplorerTable
        rows={explorer.rows}
        total={explorer.total}
        favoriteKeys={favoriteKeys}
        isAuthenticated={userId !== null}
      />
    </PageShell>
  );
}
