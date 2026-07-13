import { NextResponse } from "next/server";
import { loadoutInputSchema } from "@/features/loadouts/loadouts.schema";
import {
  createLoadout,
  LoadoutValidationError,
} from "@/features/loadouts/loadouts.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`loadouts:create:${userId}`, 20, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = loadoutInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = await getDb();
  try {
    const loadout = await createLoadout(db, userId, parsed.data);
    return NextResponse.json(loadout);
  } catch (error) {
    if (error instanceof LoadoutValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
