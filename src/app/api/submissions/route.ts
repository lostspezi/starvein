import { NextResponse } from "next/server";
import { z } from "zod";
import { MINING_METHODS } from "@/features/ores/ores.schema";
import {
  SubmissionValidationError,
  createOccurrenceSubmission,
  listSubmissionsForLocation,
} from "@/features/submissions/submissions.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  oreCode: z.string().regex(/^[A-Z]{2,5}$/),
  systemCode: z.string().regex(/^[A-Z]+$/),
  bodySlug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  method: z.enum(MINING_METHODS),
  probabilityPercent: z.number().min(0).max(100),
});

const listParamsSchema = z.object({
  system: z.string().regex(/^[A-Z]+$/),
  body: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = listParamsSchema.safeParse({
    system: url.searchParams.get("system") ?? "",
    body: url.searchParams.get("body") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const db = await getDb();
  return NextResponse.json(
    await listSubmissionsForLocation(db, parsed.data.system, parsed.data.body),
  );
}

export async function POST(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`submissions:${userId}`, 20, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = await getDb();
  try {
    const submission = await createOccurrenceSubmission(
      db,
      userId,
      parsed.data,
    );
    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    if (error instanceof SubmissionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
