import { routing } from "@/i18n/routing";
import { safeFetch } from "@/lib/safe-fetch";
import { SITE_URL } from "@/lib/seo";

/**
 * IndexNow-Ping: teilt Bing/Yandex/DuckDuckGo nach dem Wiki-Sync mit, dass
 * sich Inhalte geändert haben, damit sie zeitnah re-crawlen. Google
 * unterstützt IndexNow nicht — dort läuft die Indexierung über Sitemap + GSC.
 *
 * Der Ownership-Nachweis läuft über /indexnow-key.txt (Route-Handler, liefert
 * den Key aus der Env). Ohne INDEXNOW_KEY wird der Ping still übersprungen;
 * Fehler blockieren den Sync nie (nur Logging).
 */

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** Stabile URL, unter der der Route-Handler den Key als Klartext ausliefert. */
const KEY_LOCATION = `${SITE_URL}/indexnow-key.txt`;

/** Kern-Hub-Seiten, deren Inhalt bei jedem Wiki-Sync aktualisiert wird. */
const CORE_PATHS = [
  "/ores",
  "/occurrences",
  "/signatures",
  "/locations",
  "/materials",
  "/blueprints",
];

/** Die zu pingenden Kern-URLs (alle Locales × Hub-Seiten). */
export function coreIndexNowUrls(): string[] {
  return routing.locales.flatMap((locale) =>
    CORE_PATHS.map((path) => `${SITE_URL}/${locale}${path}`),
  );
}

/**
 * Meldet eine Liste von URLs an IndexNow. Gibt true bei erfolgreichem Ping
 * zurück, sonst false (kein Key, leere Liste, Fehler-Response, Netzwerkfehler).
 * Wirft nie.
 */
export async function submitUrls(urls: string[]): Promise<boolean> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || urls.length === 0) {
    return false;
  }

  const host = new URL(SITE_URL).host;
  try {
    const res = await safeFetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: KEY_LOCATION,
        urlList: urls,
      }),
    });
    if (!res.ok) {
      console.error(`IndexNow ping failed with status ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("IndexNow ping error", err);
    return false;
  }
}
