import { NextResponse } from "next/server";
import { warehouseEntryInputSchema } from "@/features/warehouse/warehouse.schema";
import {
  createWarehouseEntry,
  WarehouseValidationError,
} from "@/features/warehouse/warehouse.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`warehouse:create:${userId}`, 60, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = warehouseEntryInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = await getDb();
  try {
    const entry = await createWarehouseEntry(db, userId, parsed.data);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof WarehouseValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
