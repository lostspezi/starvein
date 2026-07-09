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
import { getDb } from "@/lib/db";
import { parseEnumParam } from "@/lib/search-params";

export const dynamic = "force-dynamic";

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
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <OreFilters />
      <OreList ores={ores} />
    </section>
  );
}
