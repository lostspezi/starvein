import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { OreBlueprintsPanel } from "@/features/blueprints/OreBlueprintsPanel";
import { findBlueprintsUsingOre } from "@/features/blueprints/blueprints.service";
import { OreOccurrencesSection } from "@/features/ore-occurrences/OreOccurrencesSection";
import { buildOreOccurrenceStats } from "@/features/ore-occurrences/occurrence-stats";
import { findOccurrencesByOreWithLocationCached } from "@/features/ore-occurrences/ore-occurrences.service";
import { findOreByCode } from "@/features/ores/ores.repository";
import { MINING_METHODS } from "@/features/ores/ores.schema";
import { PriceAndYieldPanel } from "@/features/refinery-and-prices/PriceAndYieldPanel";
import {
  findRefineryYieldsByOre,
  getCachedOrePriceSummary,
} from "@/features/refinery-and-prices/price-summary";
import { OreSignatureInfo } from "@/features/signature-profiles/OreSignatureInfo";
import { findSignatureProfilesByOre } from "@/features/signature-profiles/signature-profiles.repository";
import { Breadcrumbs } from "@/lib/components/Breadcrumbs";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

// ISR: on-demand gerendert und 1h gecacht; der Wiki-/UEX-Sync stößt per
// revalidatePath einen früheren Refresh an. Methoden-Filter läuft im Client.
export const revalidate = 3600;

// Leer: nichts wird beim Build prerendert (kein Mongo im Docker-Builder),
// Pfade entstehen on-demand und werden dann gemaess revalidate gecacht.
export function generateStaticParams() {
  return [];
}

/**
 * Erze speisen fast das gesamte Crafting (Aslarite z. B. über 800 Blueprints) —
 * die Erz-Seite zeigt nur einen Ausschnitt plus Link auf die gefilterte Liste.
 */
const BLUEPRINT_PREVIEW_LIMIT = 10;

/** generateMetadata und Page teilen sich dieselbe Occurrence-Query pro Request. */
const getOccurrences = cache((oreCode: string) =>
  getDb().then((db) => findOccurrencesByOreWithLocationCached(db, oreCode)),
);

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
  const stats = buildOreOccurrenceStats(await getOccurrences(ore.code));

  // Description mit echten Daten (Fundort-Zahl, beste Chance) — deutlich
  // aussagekräftiger im SERP-Snippet als der generische Satz.
  const description = stats.best
    ? t("oreDetail.descriptionStats", {
        ore: ore.name_en,
        locationCount: stats.locationCount,
        systemCount: stats.systemCount,
        probability: Math.round(stats.best.probabilityPercent),
        body: stats.best.bodyName,
      })
    : t("oreDetail.description", { ore: ore.name_en });

  return pageMetadata({
    locale,
    path: `/ores/${ore.code.toLowerCase()}`,
    title: ore.name_en,
    description,
    ownOgImage: true,
  });
}

export default async function OreDetailPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const db = await getDb();
  const ore = await findOreByCode(db, code.toUpperCase());
  if (!ore) {
    notFound();
  }

  const t = await getTranslations();
  const [
    occurrences,
    signatureProfiles,
    priceSummary,
    refineryYields,
    blueprintsUsingOre,
  ] = await Promise.all([
    getOccurrences(ore.code),
    findSignatureProfilesByOre(db, ore.code),
    getCachedOrePriceSummary(db, ore.code),
    findRefineryYieldsByOre(db, ore.code),
    findBlueprintsUsingOre(db, ore.code),
  ]);
  const stats = buildOreOccurrenceStats(occurrences);

  return (
    <PageShell>
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("common.nav.ores"), href: "/ores" },
          { label: ore.name_en },
        ]}
      />
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

      <p className="max-w-3xl text-sm text-text-muted">
        {stats.best
          ? t("ores.detail.summary", {
              locationCount: stats.locationCount,
              systemCount: stats.systemCount,
              probability: Math.round(stats.best.probabilityPercent),
              body: stats.best.bodyName,
              method: t(`ores.method.${stats.best.method}`),
            })
          : t("ores.detail.noOccurrences")}
      </p>

      <OreSignatureInfo profiles={signatureProfiles} />

      <PriceAndYieldPanel summary={priceSummary} yields={refineryYields} />

      <h2 className="text-lg font-medium">{t("occurrences.whereToFind")}</h2>
      <OreOccurrencesSection occurrences={occurrences} />
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
