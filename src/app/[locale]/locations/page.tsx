import { getTranslations, setRequestLocale } from "next-intl/server";
import { SystemList } from "@/features/locations/SystemList";
import { findAllStarSystems } from "@/features/locations/locations.repository";
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
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <SystemList systems={systems} />
    </section>
  );
}
