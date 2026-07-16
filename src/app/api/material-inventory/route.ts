import { NextResponse } from "next/server";
import { listMaterialInventory } from "@/features/blueprints/material-inventory.repository";
import { materialInventorySetInputSchema } from "@/features/blueprints/material-inventory.schema";
import {
  InventoryValidationError,
  setInventory,
} from "@/features/blueprints/material-inventory.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  return NextResponse.json(await listMaterialInventory(db, userId));
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`inventory:set:${userId}`, 120, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = materialInventorySetInputSchema.safeParse(
    await request.json(),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = await getDb();
  try {
    const entry = await setInventory(db, userId, parsed.data);
    // quantity 0 löscht den Eintrag — kein Body zurückgeben.
    return entry
      ? NextResponse.json(entry)
      : new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof InventoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
