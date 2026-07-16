import type { Db } from "mongodb";
import { listPublicGuides } from "@/features/guides/guides.repository";
import type { Guide } from "@/features/guides/guides.schema";

export type GuideShowcase = {
  feature: Guide | null;
  newest: Guide[];
};

const NEWEST_COUNT = 4;

/**
 * Read-Model für die Guide-Sektion der Startseite: der höchstbewertete
 * öffentliche Guide als Feature plus die neuesten Einträge. Das Feature wird
 * aus "newest" dededupliziert, damit es nicht doppelt auftaucht.
 */
export async function findGuideShowcase(db: Db): Promise<GuideShowcase> {
  const [topRaw, newestRaw] = await Promise.all([
    listPublicGuides(db, { sort: "top", limit: 1 }),
    listPublicGuides(db, { sort: "new", limit: NEWEST_COUNT + 1 }),
  ]);

  const feature = topRaw[0] ?? null;
  return {
    feature,
    newest: newestRaw
      .filter((guide) => guide.id !== feature?.id)
      .slice(0, NEWEST_COUNT),
  };
}
