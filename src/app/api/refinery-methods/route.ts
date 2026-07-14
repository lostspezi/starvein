import { NextResponse } from "next/server";
import { listRefineryMethods } from "@/features/refinery-and-prices/refinery-catalog";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  return NextResponse.json(await listRefineryMethods(db));
}
