import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompareGrid } from "@/features/ore-compare/CompareGrid";
import { CompareSelect } from "@/features/ore-compare/CompareSelect";
import {
  MAX_COMPARE_ORES,
  getOreComparison,
} from "@/features/ore-compare/compare.service";
import { findAllOres } from "@/features/ores/ores.repository";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ComparePage({
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
  const known = new Set(ores.map((ore) => ore.code));

  const sp = await searchParams;
  const requested = (typeof sp.ores === "string" ? sp.ores.split(",") : [])
    .filter((code) => known.has(code))
    .slice(0, MAX_COMPARE_ORES);

  const t = await getTranslations("compare");
  const columns = await getOreComparison(db, requested);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <CompareSelect ores={ores} />
      <CompareGrid columns={columns} />
    </section>
  );
}
