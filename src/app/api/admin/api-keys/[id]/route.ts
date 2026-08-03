import { NextResponse } from "next/server";
import { adminRevokeKey } from "@/features/api-keys/admin-api-keys.service";
import { requireAdmin } from "@/features/api-keys/admin-guard";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request.headers);
  if (denied) return denied;

  const { id } = await params;
  const db = await getDb();
  if (!(await adminRevokeKey(db, id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
