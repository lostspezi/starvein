import { NextResponse } from "next/server";
import { findOreByCode } from "@/features/ores/ores.repository";
import { envelope } from "@/features/public-api/envelope";
import { v1Options, withApiV1 } from "@/features/public-api/with-api-v1";

export const dynamic = "force-dynamic";

export const GET = withApiV1<{ code: string }>(
  "ores/{code}",
  async ({ db, params }) => {
    const ore = await findOreByCode(db, params.code);
    if (!ore) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(envelope(ore));
  },
);

export const OPTIONS = v1Options;
