import { getTranslations, setRequestLocale } from "next-intl/server";
import { MaterialListSection } from "@/features/blueprints/MaterialListSection";
import { findAllMaterials } from "@/features/blueprints/materials.repository";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

// Param-lose Seite: bleibt dynamisch, weil der Docker-Build ohne Mongo läuft
// und ein statischer Prerender fehlschlüge. Gefiltert wird clientseitig.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "materials" });
  return pageMetadata({
    locale,
    path: "/materials",
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("materials");
  const materials = await findAllMaterials(await getDb());

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <MaterialListSection materials={materials} />
    </PageShell>
  );
}
