import { NextResponse } from "next/server";
import { runFullWikiSync } from "@/lib/run-wiki-sync";
import { getDb } from "@/lib/db";
import { revalidateAfterSync } from "@/lib/revalidate-after-sync";

export const dynamic = "force-dynamic";

/**
 * Sync-Trigger für Cron-Jobs (CLAUDE.md §6.1): niemals durch User-Requests
 * ausgelöst, nur mit Secret-Header. Fail closed: ohne konfiguriertes
 * SYNC_SECRET wird jede Anfrage abgelehnt.
 */
export async function POST(request: Request) {
  const configured = process.env.SYNC_SECRET;
  const provided = request.headers.get("x-sync-secret");

  if (!configured || provided !== configured) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const summary = await runFullWikiSync(db);
  revalidateAfterSync("wiki");
  return NextResponse.json(summary);
}
