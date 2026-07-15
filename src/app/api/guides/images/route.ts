import { NextResponse } from "next/server";
import {
  GUIDE_IMAGE_MAX_BYTES,
  GuideImageError,
  uploadGuideImage,
} from "@/features/guides/guides.images.repository";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`guides:image:${userId}`, 60, 3600))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (file.size > GUIDE_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "image too large" }, { status: 413 });
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const filename = file instanceof File ? file.name : undefined;

  const db = await getDb();
  try {
    const id = await uploadGuideImage(db, {
      data,
      contentType: file.type,
      ownerUserId: userId,
      filename,
    });
    return NextResponse.json({ id, url: `/api/guides/images/${id}` });
  } catch (error) {
    if (error instanceof GuideImageError) {
      const status = error.message === "image too large" ? 413 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}
