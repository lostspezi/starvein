import { NextResponse } from "next/server";
import { loadoutInputSchema } from "@/features/loadouts/loadouts.schema";
import {
  deleteLoadout,
  LoadoutNotFoundError,
  LoadoutValidationError,
  updateLoadout,
} from "@/features/loadouts/loadouts.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`loadouts:edit:${userId}`, 60, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = loadoutInputSchema.partial().safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    const loadout = await updateLoadout(db, userId, id, parsed.data);
    return NextResponse.json(loadout);
  } catch (error) {
    if (error instanceof LoadoutNotFoundError) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (error instanceof LoadoutValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    await deleteLoadout(db, userId, id);
  } catch (error) {
    if (error instanceof LoadoutNotFoundError) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
