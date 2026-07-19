import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CollectedBlueprintsSection } from "@/features/blueprints/CollectedBlueprintsSection";
import { findCollectedCraftableFromWarehouse } from "@/features/blueprints/collected-craftable.service";
import { findAllMaterials } from "@/features/blueprints/materials.repository";
import type { Material } from "@/features/blueprints/materials.schema";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { NO_INDEX } from "@/lib/seo";
import { getSessionUserId } from "@/lib/session";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "collectedBlueprints" });
  return { title: t("title"), robots: NO_INDEX };
}

export default async function CollectedBlueprintsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("collectedBlueprints");
  const userId = await getSessionUserId(await headers());

  if (!userId) {
    return (
      <PageShell>
        <PageHeader title={t("title")} />
        <p className="text-text-muted">{t("loginRequired")}</p>
      </PageShell>
    );
  }

  const db = await getDb();
  const [entries, materials] = await Promise.all([
    findCollectedCraftableFromWarehouse(db, userId),
    findAllMaterials(db),
  ]);
  const materialsByCode: Record<string, Material> = Object.fromEntries(
    materials.map((m) => [m.code, m]),
  );

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        <GlowLink href="/blueprints">{t("blueprintsLink")}</GlowLink>
        <GlowLink href="/warehouse">{t("warehouseLink")}</GlowLink>
      </p>
      <CollectedBlueprintsSection
        entries={entries}
        materialsByCode={materialsByCode}
        emptyLabel={t("empty")}
      />
    </PageShell>
  );
}
