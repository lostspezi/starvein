import { NextResponse } from "next/server";
import { findAllOres } from "@/features/ores/ores.repository";
import { getDb } from "@/lib/db";
import { enforceReadRateLimit } from "@/lib/read-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = await enforceReadRateLimit(request, "ores");
  if (limited) return limited;

  const db = await getDb();
  return NextResponse.json(await findAllOres(db));
}
