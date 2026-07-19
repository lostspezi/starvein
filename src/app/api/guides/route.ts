import { NextResponse } from "next/server";
import { guideInputSchema } from "@/features/guides/guides.schema";
import {
  createGuide,
  GuideValidationError,
} from "@/features/guides/guides.service";
import { listPublicGuides } from "@/features/guides/guides.repository";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { enforceReadRateLimit } from "@/lib/read-rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = await enforceReadRateLimit(request, "guides");
  if (limited) return limited;

  const db = await getDb();
  return NextResponse.json(await listPublicGuides(db));
}

export async function POST(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`guides:create:${userId}`, 20, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = guideInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = await getDb();
  try {
    const guide = await createGuide(db, userId, parsed.data);
    return NextResponse.json(guide);
  } catch (error) {
    if (error instanceof GuideValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
