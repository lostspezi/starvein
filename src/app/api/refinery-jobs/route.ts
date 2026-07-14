import { NextResponse } from "next/server";
import { listRefineryJobsByOwner } from "@/features/refinery-jobs/refinery-jobs.repository";
import { refineryJobInputSchema } from "@/features/refinery-jobs/refinery-jobs.schema";
import {
  createRefineryJob,
  RefineryJobValidationError,
} from "@/features/refinery-jobs/refinery-jobs.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  return NextResponse.json(await listRefineryJobsByOwner(db, userId));
}

export async function POST(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`refinery-jobs:create:${userId}`, 30, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = refineryJobInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = await getDb();
  try {
    const job = await createRefineryJob(db, userId, parsed.data);
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error instanceof RefineryJobValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
