import { getTranslations, setRequestLocale } from "next-intl/server";
import { SystemList } from "@/features/locations/SystemList";
import { findAllStarSystemsCached } from "@/features/locations/locations.repository";
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
    path: "/locations",
    title: t("locations.title"),
    description: t("locations.description"),
  });
}

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("locations");
  const systems = await findAllStarSystemsCached(await getDb());

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      <SystemList systems={systems} />
    </PageShell>
  );
}
