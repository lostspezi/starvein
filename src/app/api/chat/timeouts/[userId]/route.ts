import { NextResponse } from "next/server";
import {
  ModerationError,
  revokeChatTimeoutAsModerator,
} from "@/features/moderation/moderation.service";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const db = await getDb();
  try {
    await revokeChatTimeoutAsModerator(db, user, userId);
  } catch (error) {
    if (error instanceof ModerationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
