import { NextResponse } from "next/server";
import { z } from "zod";
import {
  changeUserRole,
  ModerationError,
} from "@/features/moderation/moderation.service";
import { ASSIGNABLE_ROLES } from "@/features/moderation/roles";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// "admin" ist bewusst nicht vergebbar — nur per promote-Skript
const bodySchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    await changeUserRole(db, user, id, parsed.data.role);
    return NextResponse.json({ id, role: parsed.data.role });
  } catch (error) {
    if (error instanceof ModerationError) {
      const status = error.code === "notFound" ? 404 : 403;
      return NextResponse.json({ error: error.code }, { status });
    }
    throw error;
  }
}
