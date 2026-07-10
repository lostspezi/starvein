import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyChatTimeout,
  ModerationError,
} from "@/features/moderation/moderation.service";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.string().min(1),
  durationMinutes: z.union([z.literal(5), z.literal(60), z.literal(1440)]),
});

export async function POST(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = await getDb();
  try {
    const { until } = await applyChatTimeout(
      db,
      user,
      parsed.data.userId,
      parsed.data.durationMinutes,
    );
    return NextResponse.json(
      { userId: parsed.data.userId, until },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ModerationError) {
      const status = error.code === "notFound" ? 404 : 403;
      return NextResponse.json({ error: error.code }, { status });
    }
    throw error;
  }
}
