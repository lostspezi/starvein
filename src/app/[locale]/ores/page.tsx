import { getTranslations, setRequestLocale } from "next-intl/server";
import { OreFilters } from "@/features/ores/OreFilters";
import { OreList } from "@/features/ores/OreList";
import { filterOres } from "@/features/ores/ores.filter";
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
    path: "/ores",
    title: t("ores.title"),
    description: t("ores.description"),
  });
}

export default async function OresPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const rarity = parseEnumParam<RarityTier>(sp.rarity, RARITY_TIERS);
  const method = parseEnumParam<MiningMethod>(sp.method, MINING_METHODS);

  const t = await getTranslations("ores");
  const ores = filterOres(await findAllOres(await getDb()), {
    rarity,
    method,
  });

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      <OreFilters />
      <OreList ores={ores} />
    </PageShell>
  );
}
