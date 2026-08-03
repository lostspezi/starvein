import { NextResponse } from "next/server";
import { aggregateApiUsage } from "@/features/public-api/usage-aggregation.service";
import { getDb } from "@/lib/db";
import { getRedis } from "@/lib/redis";
import { isAuthorizedSyncRequest } from "@/lib/sync-auth";

export const dynamic = "force-dynamic";

/**
 * Stündlicher Cron (siehe docs/DEPLOY.md): flusht die Redis-Stunden-
 * Buckets des API-Usage-Trackings nach MongoDB. Wie die übrigen
 * Sync-Endpunkte über x-sync-secret abgesichert (fail closed).
 */
export async function POST(request: Request) {
  if (!isAuthorizedSyncRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.REDIS_URL) {
    // Ohne Redis gibt es keine Buckets zu flushen
    return NextResponse.json({ ok: true, flushedBuckets: 0 });
  }

  const redis = getRedis();
  if (redis.status === "wait" || redis.status === "end") {
    await redis.connect();
  }

  const db = await getDb();
  const { flushedBuckets } = await aggregateApiUsage(db, redis);
  return NextResponse.json({ ok: true, flushedBuckets });
}
