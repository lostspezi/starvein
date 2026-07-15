import { NextResponse } from "next/server";
import { warehouseMoveInputSchema } from "@/features/warehouse/warehouse.schema";
import {
  moveWarehouseEntry,
  WarehouseNotFoundError,
  WarehouseValidationError,
} from "@/features/warehouse/warehouse.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`warehouse:move:${userId}`, 120, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = warehouseMoveInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    const entry = await moveWarehouseEntry(db, userId, id, parsed.data);
    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof WarehouseNotFoundError) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (error instanceof WarehouseValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
