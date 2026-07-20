import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { NO_INDEX } from "@/lib/seo";
import { requireDashboardAdmin } from "@/features/admin-dashboard/admin-access.guard";
import { getRegistrationStats } from "@/features/admin-dashboard/registrations.repository";
import { getSeoAnalytics } from "@/features/admin-dashboard/cloudflare-analytics.client";
import { RegistrationsPanel } from "@/features/admin-dashboard/RegistrationsPanel";
import { SeoPanel } from "@/features/admin-dashboard/SeoPanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminDashboard" });
  return { title: t("metaTitle"), robots: NO_INDEX };
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Zugriff nur für per ADMIN_DISCORD_IDS definierte Admins. Anonyme UND
  // Nicht-Admins bekommen 404 — die Seite verrät ihre Existenz nicht.
  const admin = await requireDashboardAdmin(await headers());
  if (!admin) {
    notFound();
  }

  const t = await getTranslations("adminDashboard");
  const db = await getDb();
  const [stats, seo] = await Promise.all([
    getRegistrationStats(db, new Date()),
    getSeoAnalytics(),
  ]);

  return (
    <PageShell width="xl">
      <PageHeader title={t("title")} />
      <RegistrationsPanel stats={stats} />
      <SeoPanel analytics={seo} />
    </PageShell>
  );
}
