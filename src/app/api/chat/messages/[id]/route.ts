import { NextResponse } from "next/server";
import {
  deleteChatMessageAsModerator,
  ModerationError,
} from "@/features/moderation/moderation.service";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    await deleteChatMessageAsModerator(db, user, id);
  } catch (error) {
    if (error instanceof ModerationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    throw error;
  }
  // Idempotent: auch unbekannte/bereits gelöschte ids sind ein Erfolg
  return new NextResponse(null, { status: 204 });
}
