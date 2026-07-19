import { NextResponse } from "next/server";
import { syncUex } from "@/features/refinery-and-prices/sync.service";
import { getDb } from "@/lib/db";
import { revalidateAfterSync } from "@/lib/revalidate-after-sync";
import { isAuthorizedSyncRequest } from "@/lib/sync-auth";

export const dynamic = "force-dynamic";

/**
 * Sync-Trigger für Cron-Jobs (CLAUDE.md §6.1): niemals durch User-Requests
 * ausgelöst, nur mit Secret-Header. Fail closed: ohne konfiguriertes
 * SYNC_SECRET wird jede Anfrage abgelehnt (timing-sicherer Vergleich).
 */
export async function POST(request: Request) {
  if (!isAuthorizedSyncRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const summary = await syncUex(db);
  revalidateAfterSync("uex");
  return NextResponse.json(summary);
}
