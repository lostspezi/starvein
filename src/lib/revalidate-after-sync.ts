import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "./data-cache";

export type SyncKind = "wiki" | "uex";

/** ISR-Routen, deren Inhalt aus den Wiki-Spieldaten gespeist wird. */
const WIKI_ISR_ROUTES = [
  "/[locale]/ores/[code]",
  "/[locale]/locations/[system]",
  "/[locale]/locations/[system]/[body]",
  "/[locale]/materials/[code]",
  "/[locale]/blueprints/[slug]",
] as const;

/** ISR-Routen mit UEX-Preisdaten (PriceAndYieldPanel). */
const UEX_ISR_ROUTES = ["/[locale]/ores/[code]"] as const;

/**
 * Invalidiert Data-Cache-Tag und ISR-Seiten nach einem erfolgreichen Sync.
 * Läuft in den Sync-Route-Handlern (POST /api/sync-wiki, /api/sync-uex) —
 * die tsx-Skripte laufen außerhalb der Next-Runtime und können den Cache
 * nicht invalidieren, deshalb muss der Prod-Cron die API-Routen aufrufen.
 * Ein fehlender Cache-Store darf den Sync selbst nie scheitern lassen.
 */
export function revalidateAfterSync(kind: SyncKind): void {
  try {
    revalidateTag(kind === "wiki" ? CACHE_TAGS.wiki : CACHE_TAGS.uex, "max");
    const routes = kind === "wiki" ? WIKI_ISR_ROUTES : UEX_ISR_ROUTES;
    for (const route of routes) {
      revalidatePath(route, "page");
    }
  } catch {
    // Außerhalb der Next-Runtime (Tests/Skripte): nichts zu invalidieren
  }
}
