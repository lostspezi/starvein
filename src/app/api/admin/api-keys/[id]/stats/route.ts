import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/api-keys/admin-guard";
import { getKeyStats } from "@/features/api-keys/key-stats.service";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Wie die Owner-Stats-Route, aber ohne Ownership-Bindung (Admin). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request.headers);
  if (denied) return denied;

  const { id } = await params;
  const db = await getDb();
  return NextResponse.json(await getKeyStats(db, id));
}
