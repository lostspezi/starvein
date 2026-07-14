import { NextResponse } from "next/server";
import { refineryJobInputSchema } from "@/features/refinery-jobs/refinery-jobs.schema";
import {
  deleteRefineryJob,
  RefineryJobNotFoundError,
  RefineryJobValidationError,
  updateRefineryJob,
} from "@/features/refinery-jobs/refinery-jobs.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`refinery-jobs:edit:${userId}`, 60, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = refineryJobInputSchema
    .partial()
    .safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    const job = await updateRefineryJob(db, userId, id, parsed.data);
    return NextResponse.json(job);
  } catch (error) {
    if (error instanceof RefineryJobNotFoundError) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (error instanceof RefineryJobValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    await deleteRefineryJob(db, userId, id);
  } catch (error) {
    if (error instanceof RefineryJobNotFoundError) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
