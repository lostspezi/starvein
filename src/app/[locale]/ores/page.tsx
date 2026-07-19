import { getTranslations, setRequestLocale } from "next-intl/server";
import { OreListSection } from "@/features/ores/OreListSection";
import { findAllOresWithSignaturesCached } from "@/features/ores/ores.service";
import { getBestSellByOreCached } from "@/features/refinery-and-prices/price-summary";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

// Param-lose Seite: bleibt dynamisch, weil der Docker-Build ohne Mongo läuft
// und ein statischer Prerender fehlschlüge. Die Daten kommen aus dem
// Data-Cache (wiki-data), gefiltert wird clientseitig (OreListSection).
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
    path: "/ores",
    title: t("ores.title"),
    description: t("ores.description"),
  });
}

export default async function OresPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("ores");
  const db = await getDb();
  // Signaturen wiki-gecacht, Preise uex-gecacht (frisch) — auf der Seite
  // gemerged, damit Preise nicht im wiki-Cache veralten.
  const [ores, bestSellByOre] = await Promise.all([
    findAllOresWithSignaturesCached(db),
    getBestSellByOreCached(db),
  ]);
  const rows = ores.map((ore) => {
    const bestSell = bestSellByOre.get(ore.code);
    return {
      ...ore,
      bestRawSell: bestSell?.raw ?? null,
      bestRefinedSell: bestSell?.refined ?? null,
    };
  });

  return (
    <PageShell>
      <PageHeader title={t("title")} subtitle={t("intro")} />
      <OreListSection ores={rows} />
    </PageShell>
  );
}
