import { NextResponse } from "next/server";
import { listAllKeysWithOwners } from "@/features/api-keys/admin-api-keys.service";
import { requireAdmin } from "@/features/api-keys/admin-guard";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdmin(request.headers);
  if (denied) return denied;

  const db = await getDb();
  return NextResponse.json(await listAllKeysWithOwners(db));
}
