import { NextResponse } from "next/server";
import { getCachedTickerEntries } from "@/features/price-ticker/ticker.service";
import { getDb } from "@/lib/db";
import { enforceReadRateLimit } from "@/lib/read-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = await enforceReadRateLimit(request, "price-ticker");
  if (limited) return limited;

  const db = await getDb();
  return NextResponse.json(await getCachedTickerEntries(db));
}
