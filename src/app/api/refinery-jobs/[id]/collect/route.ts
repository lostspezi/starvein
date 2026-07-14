import { NextResponse } from "next/server";
import { collectJobInputSchema } from "@/features/refinery-jobs/refinery-jobs.schema";
import {
  collectRefineryJob,
  RefineryJobNotFoundError,
  RefineryJobValidationError,
} from "@/features/refinery-jobs/refinery-jobs.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`refinery-jobs:collect:${userId}`, 60, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = collectJobInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    const result = await collectRefineryJob(db, userId, id, parsed.data);
    return NextResponse.json(result);
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
