import { getTranslations, setRequestLocale } from "next-intl/server";
import { OreListSection } from "@/features/ores/OreListSection";
import { findAllOresCached } from "@/features/ores/ores.repository";
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
  const ores = await findAllOresCached(await getDb());

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      <OreListSection ores={ores} />
    </PageShell>
  );
}
