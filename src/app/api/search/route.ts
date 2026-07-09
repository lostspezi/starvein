import { NextResponse } from "next/server";
import { z } from "zod";
import { searchAll } from "@/features/search/search.service";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const querySchema = z.string().max(100);

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("q") ?? "";

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }

  const db = await getDb();
  return NextResponse.json(await searchAll(db, parsed.data));
}
