/**
 * Ownership-Nachweis für IndexNow: liefert den INDEXNOW_KEY als Klartext unter
 * einer stabilen URL, auf die `submitUrls` per keyLocation zeigt. So muss kein
 * (deployment-spezifischer) Key als Datei ins Repo committet werden. Ohne
 * gesetzten Key gibt es die Datei nicht (404).
 */
export function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
