import { NextResponse } from "next/server";
import { listCollectedBlueprints } from "@/features/blueprints/blueprint-collection.repository";
import { blueprintCollectionInputSchema } from "@/features/blueprints/blueprint-collection.schema";
import {
  BlueprintNotFoundError,
  collectBlueprint,
  uncollectBlueprint,
} from "@/features/blueprints/blueprint-collection.service";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function invalidBody() {
  return NextResponse.json({ error: "invalid body" }, { status: 400 });
}

export async function GET(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) return unauthorized();

  const db = await getDb();
  return NextResponse.json(await listCollectedBlueprints(db, userId));
}

export async function POST(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) return unauthorized();

  const parsed = blueprintCollectionInputSchema.safeParse(await request.json());
  if (!parsed.success) return invalidBody();

  const db = await getDb();
  try {
    await collectBlueprint(db, userId, parsed.data.blueprintKey);
  } catch (error) {
    if (error instanceof BlueprintNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) return unauthorized();

  const parsed = blueprintCollectionInputSchema.safeParse(await request.json());
  if (!parsed.success) return invalidBody();

  const db = await getDb();
  await uncollectBlueprint(db, userId, parsed.data.blueprintKey);
  return NextResponse.json({ ok: true });
}
