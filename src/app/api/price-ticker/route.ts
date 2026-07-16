import { NextResponse } from "next/server";
import { getCachedTickerEntries } from "@/features/price-ticker/ticker.service";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  return NextResponse.json(await getCachedTickerEntries(db));
}
