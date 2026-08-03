import { NextResponse } from "next/server";
import { createKeySchema } from "@/features/api-keys/api-keys.schema";
import {
  KeyCreationBannedError,
  KeyLimitError,
  createKey,
  listKeys,
} from "@/features/api-keys/api-keys.service";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) return unauthorized();

  const db = await getDb();
  return NextResponse.json(await listKeys(db, userId));
}

export async function POST(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) return unauthorized();

  const parsed = createKeySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = await getDb();
  try {
    // Einzige Response, die das volle Key-Material enthält (show once)
    const created = await createKey(db, userId, parsed.data.name);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof KeyLimitError) {
      return NextResponse.json({ error: "key limit reached" }, { status: 403 });
    }
    if (error instanceof KeyCreationBannedError) {
      return NextResponse.json({ error: "banned" }, { status: 403 });
    }
    throw error;
  }
}
