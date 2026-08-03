import { NextResponse } from "next/server";
import { envelope } from "@/features/public-api/envelope";
import {
  parseQuery,
  yieldsQuerySchema,
} from "@/features/public-api/v1-queries";
import { v1Options, withApiV1 } from "@/features/public-api/with-api-v1";
import { findRefineryYieldsByOre } from "@/features/refinery-and-prices/price-summary";

export const dynamic = "force-dynamic";

export const GET = withApiV1("refinery-yields", async ({ db, request }) => {
  const parsed = parseQuery(yieldsQuerySchema, request);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }

  const yields = await findRefineryYieldsByOre(db, parsed.data.ore);
  return NextResponse.json(envelope(yields));
});

export const OPTIONS = v1Options;
