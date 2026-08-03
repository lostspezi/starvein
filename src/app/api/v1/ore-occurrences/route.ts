import { NextResponse } from "next/server";
import { findAllOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import { envelope } from "@/features/public-api/envelope";
import {
  occurrenceQuerySchema,
  parseQuery,
} from "@/features/public-api/v1-queries";
import { v1Options, withApiV1 } from "@/features/public-api/with-api-v1";

export const dynamic = "force-dynamic";

export const GET = withApiV1("ore-occurrences", async ({ db, request }) => {
  const parsed = parseQuery(occurrenceQuerySchema, request);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }

  const occurrences = await findAllOccurrences(db, {
    oreCode: parsed.data.ore,
    systemCode: parsed.data.system,
    method: parsed.data.method,
    deposit: parsed.data.deposit,
  });
  return NextResponse.json(envelope(occurrences));
});

export const OPTIONS = v1Options;
