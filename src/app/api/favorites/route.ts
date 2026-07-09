import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from "@/features/favorites/favorites.repository";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  systemCode: z.string().regex(/^[A-Z]+$/),
  bodySlug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) return unauthorized();

  const db = await getDb();
  return NextResponse.json(await listFavorites(db, userId));
}

export async function POST(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) return unauthorized();

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = await getDb();
  await addFavorite(db, userId, parsed.data.systemCode, parsed.data.bodySlug);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) return unauthorized();

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = await getDb();
  await removeFavorite(
    db,
    userId,
    parsed.data.systemCode,
    parsed.data.bodySlug,
  );
  return NextResponse.json({ ok: true });
}
