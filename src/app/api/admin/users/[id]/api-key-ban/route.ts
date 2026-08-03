import { NextResponse } from "next/server";
import { z } from "zod";
import { setApiKeyBan } from "@/features/api-keys/admin-api-keys.service";
import { requireAdmin } from "@/features/api-keys/admin-guard";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ banned: z.boolean() });

/** Sperrt/entsperrt das Erstellen neuer API-Keys für einen Nutzer. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request.headers);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { id } = await params;
  const db = await getDb();
  if (!(await setApiKeyBan(db, id, parsed.data.banned))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ id, banned: parsed.data.banned });
}
