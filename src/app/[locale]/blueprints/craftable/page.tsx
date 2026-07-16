import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CraftableList } from "@/features/blueprints/CraftableList";
import { findCraftableForUser } from "@/features/blueprints/craftable-blueprints.service";
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
  const t = await getTranslations({ locale, namespace: "craftable" });
  return { title: t("title"), robots: NO_INDEX };
}

export default async function CraftablePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("craftable");
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
  const [{ craftable, partial }, materials] = await Promise.all([
    findCraftableForUser(db, userId),
    findAllMaterials(db),
  ]);
  const materialsByCode: Record<string, Material> = Object.fromEntries(
    materials.map((m) => [m.code, m]),
  );

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <p>
        <GlowLink href="/inventory">{t("inventoryLink")}</GlowLink>
      </p>

      <h2 className="text-lg font-medium">{t("craftableHeading")}</h2>
      <CraftableList
        entries={craftable}
        materialsByCode={materialsByCode}
        emptyLabel={t("empty")}
      />

      <h2 className="text-lg font-medium">{t("partialHeading")}</h2>
      <CraftableList
        entries={partial}
        materialsByCode={materialsByCode}
        emptyLabel={t("partialEmpty")}
      />
    </PageShell>
  );
}
