import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BodyList } from "@/features/locations/BodyList";
import { Breadcrumbs } from "@/features/locations/Breadcrumbs";
import {
  findBodiesBySystem,
  findStarSystemByCode,
} from "@/features/locations/locations.repository";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SystemPage({
  params,
}: {
  params: Promise<{ locale: string; system: string }>;
}) {
  const { locale, system: systemParam } = await params;
  setRequestLocale(locale);

  const db = await getDb();
  const system = await findStarSystemByCode(db, systemParam.toUpperCase());
  if (!system) {
    notFound();
  }

  const t = await getTranslations("locations");
  const bodies = await findBodiesBySystem(db, system.code);
  const topLevel = bodies.filter((body) => body.parentSlug === null);

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/locations" },
          { label: system.name },
        ]}
      />
      <h1 className="text-2xl font-semibold">{system.name}</h1>
      <BodyList bodies={topLevel} />
    </section>
  );
}
