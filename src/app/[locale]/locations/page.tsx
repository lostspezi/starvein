import { getTranslations, setRequestLocale } from "next-intl/server";
import { SystemList } from "@/features/locations/SystemList";
import { findAllStarSystems } from "@/features/locations/locations.repository";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("locations");
  const systems = await findAllStarSystems(await getDb());

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      <SystemList systems={systems} />
    </PageShell>
  );
}
