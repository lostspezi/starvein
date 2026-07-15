import { NextResponse } from "next/server";
import { guideInputSchema } from "@/features/guides/guides.schema";
import {
  deleteGuide,
  GuideNotFoundError,
  GuideValidationError,
  updateGuide,
} from "@/features/guides/guides.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUser, getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`guides:edit:${userId}`, 60, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = guideInputSchema.partial().safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    const guide = await updateGuide(db, userId, id, parsed.data);
    return NextResponse.json(guide);
  } catch (error) {
    if (error instanceof GuideNotFoundError) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (error instanceof GuideValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  // Rollen-bewusst: Owner ODER Admin darf löschen
  const user = await getSessionUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    await deleteGuide(db, { id: user.id, role: user.role }, id);
  } catch (error) {
    if (error instanceof GuideNotFoundError) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
