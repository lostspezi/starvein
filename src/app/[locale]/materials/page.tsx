import { getTranslations, setRequestLocale } from "next-intl/server";
import { MaterialFilters } from "@/features/blueprints/MaterialFilters";
import { MaterialList } from "@/features/blueprints/MaterialList";
import { filterMaterials } from "@/features/blueprints/materials.filter";
import { findAllMaterials } from "@/features/blueprints/materials.repository";
import {
  MATERIAL_KINDS,
  type MaterialKind,
} from "@/features/blueprints/materials.schema";
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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const kind = parseEnumParam<MaterialKind>(sp.kind, MATERIAL_KINDS);
  const q = typeof sp.q === "string" ? sp.q : null;
  const oresOnly = sp.ores === "1";

  const t = await getTranslations("materials");
  const materials = filterMaterials(await findAllMaterials(await getDb()), {
    kind,
    q,
    oresOnly,
  });

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <MaterialFilters />
      <MaterialList materials={materials} />
    </PageShell>
  );
}
