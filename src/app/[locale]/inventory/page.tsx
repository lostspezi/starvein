import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MaterialInventoryEditor } from "@/features/blueprints/MaterialInventoryEditor";
import { listMaterialInventory } from "@/features/blueprints/material-inventory.repository";
import { findAllMaterials } from "@/features/blueprints/materials.repository";
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
  const t = await getTranslations({ locale, namespace: "inventory" });
  return { title: t("title"), robots: NO_INDEX };
}

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("inventory");
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
  const [materials, entries] = await Promise.all([
    findAllMaterials(db),
    listMaterialInventory(db, userId),
  ]);
  // Der Katalog ist klein (~37 Zutaten) — alles auf einer Seite editierbar.

  const initialQuantities = Object.fromEntries(
    entries.map((entry) => [entry.materialCode, entry.quantity]),
  );

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <p>
        <GlowLink href="/blueprints/craftable">{t("craftableLink")}</GlowLink>
      </p>
      <MaterialInventoryEditor
        materials={materials}
        initialQuantities={initialQuantities}
      />
    </PageShell>
  );
}
