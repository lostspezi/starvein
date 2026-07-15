import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { openGuideImage } from "@/features/guides/guides.images.repository";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const db = await getDb();
  const file = await openGuideImage(db, id);
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Node-Readable → Web-ReadableStream für die Route-Response
  const body = Readable.toWeb(file.stream) as ReadableStream;
  return new Response(body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.length),
      // Bilder sind unveränderlich (id = ObjectId), lange cachebar
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
