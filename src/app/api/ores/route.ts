import { NextResponse } from "next/server";
import { findAllOres } from "@/features/ores/ores.repository";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  return NextResponse.json(await findAllOres(db));
}
