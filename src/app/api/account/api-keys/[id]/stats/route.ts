import { NextResponse } from "next/server";
import { findKeySummary } from "@/features/api-keys/api-keys.service";
import { getKeyStats } from "@/features/api-keys/key-stats.service";
import type { UsageRedis } from "@/features/public-api/usage-aggregation.service";
import { getDb } from "@/lib/db";
import { getRedis } from "@/lib/redis";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Redis nur, wenn konfiguriert und verbindbar — sonst Mongo-only. */
async function optionalRedis(): Promise<UsageRedis | null> {
  if (!process.env.REDIS_URL) return null;
  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }
    return redis;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  if (!(await findKeySummary(db, userId, id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const stats = await getKeyStats(db, id, { redis: await optionalRedis() });
  return NextResponse.json(stats);
}
