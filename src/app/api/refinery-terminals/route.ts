import { NextResponse } from "next/server";
import { listRefineryTerminals } from "@/features/refinery-and-prices/refinery-catalog";
import { getDb } from "@/lib/db";
import { enforceReadRateLimit } from "@/lib/read-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = await enforceReadRateLimit(request, "refinery-terminals");
  if (limited) return limited;

  const db = await getDb();
  return NextResponse.json(await listRefineryTerminals(db));
}
