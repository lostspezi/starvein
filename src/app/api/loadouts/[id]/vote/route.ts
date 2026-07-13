import { NextResponse } from "next/server";
import {
  LoadoutNotFoundError,
  LoadoutValidationError,
  toggleVote,
} from "@/features/loadouts/loadouts.service";
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

  if (!(await checkRateLimit(`loadout-votes:${userId}`, 60, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const { id } = await params;
  const db = await getDb();
  try {
    const loadout = await toggleVote(db, userId, id);
    return NextResponse.json({
      votes: loadout.votes,
      hasVoted: loadout.voters.includes(userId),
    });
  } catch (error) {
    if (error instanceof LoadoutNotFoundError) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (error instanceof LoadoutValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
