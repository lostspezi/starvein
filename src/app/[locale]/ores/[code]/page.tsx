import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OreBlueprintsPanel } from "@/features/blueprints/OreBlueprintsPanel";
import { findBlueprintsUsingOre } from "@/features/blueprints/blueprints.service";
import { MethodFilter } from "@/features/ore-occurrences/MethodFilter";
import { OreOccurrencesTable } from "@/features/ore-occurrences/OreOccurrencesTable";
import { findOccurrencesByOreWithLocation } from "@/features/ore-occurrences/ore-occurrences.service";
import { findOreByCode } from "@/features/ores/ores.repository";
import { MINING_METHODS, type MiningMethod } from "@/features/ores/ores.schema";
import { PriceAndYieldPanel } from "@/features/refinery-and-prices/PriceAndYieldPanel";
import {
  findRefineryYieldsByOre,
  getCachedOrePriceSummary,
} from "@/features/refinery-and-prices/price-summary";
import { OreSignatureInfo } from "@/features/signature-profiles/OreSignatureInfo";
import { findSignatureProfilesByOre } from "@/features/signature-profiles/signature-profiles.repository";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { parseEnumParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

/**
 * Erze speisen fast das gesamte Crafting (Aslarite z. B. über 800 Blueprints) —
 * die Erz-Seite zeigt nur einen Ausschnitt plus Link auf die gefilterte Liste.
 */
const BLUEPRINT_PREVIEW_LIMIT = 10;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const ore = await findOreByCode(await getDb(), code.toUpperCase());
  if (!ore) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: `/ores/${ore.code.toLowerCase()}`,
    title: ore.name_en,
    description: t("oreDetail.description", { ore: ore.name_en }),
  });
}

export default async function OreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const db = await getDb();
  const ore = await findOreByCode(db, code.toUpperCase());
  if (!ore) {
    notFound();
  }

  const sp = await searchParams;
  const method = parseEnumParam<MiningMethod>(sp.method, MINING_METHODS);

  const t = await getTranslations();
  const [
    occurrences,
    signatureProfiles,
    priceSummary,
    refineryYields,
    blueprintsUsingOre,
  ] = await Promise.all([
    findOccurrencesByOreWithLocation(db, ore.code, method),
    findSignatureProfilesByOre(db, ore.code),
    getCachedOrePriceSummary(db, ore.code),
    findRefineryYieldsByOre(db, ore.code),
    findBlueprintsUsingOre(db, ore.code),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={
          <>
            {ore.name_en}{" "}
            <span className="font-mono text-base text-text-muted">
              {ore.code}
            </span>
          </>
        }
        subtitle={
          <span className="text-sm">
            {t(`ores.rarity.${ore.rarityTier}`)} ·{" "}
            {MINING_METHODS.filter((m) => ore.mineableBy[m])
              .map((m) => t(`ores.method.${m}`))
              .join(" · ")}
          </span>
        }
      />

      <OreSignatureInfo profiles={signatureProfiles} />

      <PriceAndYieldPanel summary={priceSummary} yields={refineryYields} />

      <h2 className="text-lg font-medium">{t("occurrences.whereToFind")}</h2>
      <MethodFilter />
      <OreOccurrencesTable occurrences={occurrences} />
      <p className="text-xs text-text-muted">{t("occurrences.disclaimer")}</p>

      <OreBlueprintsPanel
        entries={blueprintsUsingOre.slice(0, BLUEPRINT_PREVIEW_LIMIT)}
        totalCount={blueprintsUsingOre.length}
        materialCodes={[
          ...new Set(
            blueprintsUsingOre.flatMap((entry) =>
              entry.viaMaterials.map((material) => material.code),
            ),
          ),
        ]}
      />
    </PageShell>
  );
}
