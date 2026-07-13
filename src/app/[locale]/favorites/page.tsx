import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BodyList } from "@/features/locations/BodyList";
import { listFavorites } from "@/features/favorites/favorites.repository";
import type { CelestialBody } from "@/features/locations/locations.schema";
import { celestialBodySchema } from "@/features/locations/locations.schema";
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
  return { title: t("favorites.title"), robots: NO_INDEX };
}

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("favorites");
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
  const favorites = await listFavorites(db, userId);

  let bodies: CelestialBody[] = [];
  if (favorites.length > 0) {
    const docs = await db
      .collection("celestialBodies")
      .find(
        {
          $or: favorites.map((f) => ({
            systemCode: f.systemCode,
            slug: f.bodySlug,
          })),
        },
        { projection: { _id: 0 } },
      )
      .sort({ name: 1 })
      .toArray();
    bodies = docs.map((doc) => celestialBodySchema.parse(doc));
  }

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      {bodies.length === 0 ? (
        <p className="text-text-muted">{t("empty")}</p>
      ) : (
        <BodyList bodies={bodies} />
      )}
    </PageShell>
  );
}
