import { NextResponse } from "next/server";
import { envelope } from "@/features/public-api/envelope";
import {
  parseQuery,
  signaturesQuerySchema,
} from "@/features/public-api/v1-queries";
import { v1Options, withApiV1 } from "@/features/public-api/with-api-v1";
import { findAllSignatureProfiles } from "@/features/signature-profiles/signature-profiles.repository";

export const dynamic = "force-dynamic";

export const GET = withApiV1("signatures", async ({ db, request }) => {
  const parsed = parseQuery(signaturesQuerySchema, request);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }

  const profiles = await findAllSignatureProfiles(db, parsed.data.method);
  return NextResponse.json(envelope(profiles));
});

export const OPTIONS = v1Options;
