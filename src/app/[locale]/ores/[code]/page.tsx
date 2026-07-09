import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MethodFilter } from "@/features/ore-occurrences/MethodFilter";
import { OreOccurrencesTable } from "@/features/ore-occurrences/OreOccurrencesTable";
import { findOccurrencesByOreWithLocation } from "@/features/ore-occurrences/ore-occurrences.service";
import { findOreByCode } from "@/features/ores/ores.repository";
import { MINING_METHODS, type MiningMethod } from "@/features/ores/ores.schema";
import { OreSignatureInfo } from "@/features/signature-profiles/OreSignatureInfo";
import { findSignatureProfilesByOre } from "@/features/signature-profiles/signature-profiles.repository";
import { getDb } from "@/lib/db";
import { parseEnumParam } from "@/lib/search-params";

export const dynamic = "force-dynamic";

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
  const [occurrences, signatureProfiles] = await Promise.all([
    findOccurrencesByOreWithLocation(db, ore.code, method),
    findSignatureProfilesByOre(db, ore.code),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {ore.name_en}{" "}
          <span className="font-mono text-base text-text-muted">
            {ore.code}
          </span>
        </h1>
        <p className="text-sm text-text-muted">
          {t(`ores.rarity.${ore.rarityTier}`)} ·{" "}
          {MINING_METHODS.filter((m) => ore.mineableBy[m])
            .map((m) => t(`ores.method.${m}`))
            .join(" · ")}
        </p>
      </div>

      <OreSignatureInfo profiles={signatureProfiles} />

      <h2 className="text-lg font-medium">{t("occurrences.whereToFind")}</h2>
      <MethodFilter />
      <OreOccurrencesTable occurrences={occurrences} />
      <p className="text-xs text-text-muted">{t("occurrences.disclaimer")}</p>
    </section>
  );
}
