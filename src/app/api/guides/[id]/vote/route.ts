import { NextResponse } from "next/server";
import {
  GuideNotFoundError,
  GuideValidationError,
  toggleGuideVote,
} from "@/features/guides/guides.service";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Upvote-Toggle: erster Aufruf stimmt ab, zweiter nimmt die Stimme zurück. */
export async function POST(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`guide-votes:${userId}`, 60, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    const guide = await toggleGuideVote(db, userId, id);
    return NextResponse.json({
      votes: guide.votes,
      hasVoted: guide.voters.includes(userId),
    });
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
