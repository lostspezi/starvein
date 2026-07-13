import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadEquipmentCatalog } from "@/features/loadouts/equipment.repository";
import { LoadoutBuilder } from "@/features/loadouts/LoadoutBuilder";
import { findLoadoutById } from "@/features/loadouts/loadouts.repository";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { NO_INDEX } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("editLoadout.title"), robots: NO_INDEX };
}

export default async function EditLoadoutPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("loadouts.builder");
  const db = await getDb();
  const userId = await getSessionUserId(await headers());

  const loadout = await findLoadoutById(db, id);
  // NotFound statt Forbidden: fremde/private Loadouts nicht verraten
  if (!loadout || userId === null || loadout.ownerUserId !== userId) {
    notFound();
  }

  const catalog = await loadEquipmentCatalog(db);

  return (
    <PageShell width="wide">
      <PageHeader title={t("editTitle")} />
      <LoadoutBuilder
        catalog={catalog}
        loadoutId={loadout.id}
        initialValue={{
          name: loadout.name,
          description: loadout.description,
          method: loadout.method,
          vehicleCode: loadout.vehicleCode,
          hardpoints: loadout.hardpoints,
          gadgetCodes: loadout.gadgetCodes,
          isPublic: loadout.isPublic,
        }}
      />
    </PageShell>
  );
}
