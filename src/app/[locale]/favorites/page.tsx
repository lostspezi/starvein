import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BodyList } from "@/features/locations/BodyList";
import { listFavorites } from "@/features/favorites/favorites.repository";
import type { CelestialBody } from "@/features/locations/locations.schema";
import { celestialBodySchema } from "@/features/locations/locations.schema";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

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
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted">{t("loginRequired")}</p>
      </section>
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
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {bodies.length === 0 ? (
        <p className="text-text-muted">{t("empty")}</p>
      ) : (
        <BodyList bodies={bodies} />
      )}
    </section>
  );
}
