import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SubmissionValidationError,
  voteOnSubmission,
} from "@/features/submissions/submissions.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const voteSchema = z.object({
  submissionId: z.string().min(1),
  value: z.union([z.literal(1), z.literal(-1)]),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`votes:${userId}`, 60, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = voteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = await getDb();
  try {
    const submission = await voteOnSubmission(
      db,
      parsed.data.submissionId,
      userId,
      parsed.data.value,
    );
    return NextResponse.json(submission);
  } catch (error) {
    if (error instanceof SubmissionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
