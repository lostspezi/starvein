import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadEquipmentCatalog } from "@/features/loadouts/equipment.repository";
import { listLoadoutsByOwner } from "@/features/loadouts/loadouts.repository";
import { RockCalculator } from "@/features/rock-calculator/RockCalculator";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
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
    path: "/calculator",
    title: t("calculator.title"),
    description: t("calculator.description"),
  });
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("calculator");
  const db = await getDb();
  const [catalog, userId] = await Promise.all([
    loadEquipmentCatalog(db),
    getSessionUserId(await headers()),
  ]);
  const loadouts = userId ? await listLoadoutsByOwner(db, userId) : null;

  // Nur Schiffs-Laser: Size-0-Werte sind in-game normalisiert und
  // nicht mit dem Break-Modell vergleichbar.
  const shipLasers = catalog.lasers.filter((laser) => laser.size >= 1);

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <RockCalculator
        lasers={shipLasers}
        modules={catalog.modules}
        gadgets={catalog.gadgets}
        loadouts={loadouts}
        vehicles={catalog.vehicles}
      />
      <p className="text-xs text-text-muted">{t("attribution")}</p>
    </PageShell>
  );
}
