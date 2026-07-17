import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompareGrid } from "@/features/ore-compare/CompareGrid";
import { CompareSelect } from "@/features/ore-compare/CompareSelect";
import {
  MAX_COMPARE_ORES,
  getOreComparison,
} from "@/features/ore-compare/compare.service";
import { findAllOresCached } from "@/features/ores/ores.repository";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
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
    path: "/compare",
    title: t("compare.title"),
    description: t("compare.description"),
  });
}

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
  const ores = await findAllOresCached(db);
  const known = new Set(ores.map((ore) => ore.code));

  const sp = await searchParams;
  const requested = (typeof sp.ores === "string" ? sp.ores.split(",") : [])
    .filter((code) => known.has(code))
    .slice(0, MAX_COMPARE_ORES);

  const t = await getTranslations("compare");
  const columns = await getOreComparison(db, requested);

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} />
      <CompareSelect ores={ores} />
      <CompareGrid columns={columns} />
    </PageShell>
  );
}
