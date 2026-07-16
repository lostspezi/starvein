import { NextResponse } from "next/server";
import { syncWikiBlueprints } from "@/features/blueprints/blueprints.sync";
import { getDb } from "@/lib/db";

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
  return NextResponse.json(await syncWikiBlueprints(db));
}
