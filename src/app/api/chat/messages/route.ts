import { NextResponse } from "next/server";
import { z } from "zod";
import { CHAT_MESSAGE_MAX_LENGTH } from "@/features/chat/chat.schema";
import {
  ChatValidationError,
  listChatMessages,
  postChatMessage,
} from "@/features/chat/chat.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const SLOW_MODE_SECONDS = 30;

const querySchema = z.object({
  after: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const bodySchema = z.object({
  body: z.string().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    after: searchParams.get("after") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const db = await getDb();
  const messages = await listChatMessages(
    db,
    parsed.data.after ?? null,
    parsed.data.limit,
  );
  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Slow-Mode vor der Fachvalidierung (wie bei Submissions) — auch
  // abgelehnte Nachrichten verbrauchen den Slot, das bremst Probing.
  const allowed = await checkRateLimit(`chat:${user.id}`, 1, SLOW_MODE_SECONDS);
  if (!allowed) {
    return NextResponse.json(
      { error: "rateLimited", retryAfterSeconds: SLOW_MODE_SECONDS },
      { status: 429 },
    );
  }

  const db = await getDb();
  try {
    const message = await postChatMessage(db, user, parsed.data.body);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof ChatValidationError) {
      return NextResponse.json({ error: error.code }, { status: 422 });
    }
    throw error;
  }
}
