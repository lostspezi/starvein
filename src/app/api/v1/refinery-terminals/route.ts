import { NextResponse } from "next/server";
import { envelope } from "@/features/public-api/envelope";
import { v1Options, withApiV1 } from "@/features/public-api/with-api-v1";
import { listRefineryTerminals } from "@/features/refinery-and-prices/refinery-catalog";

export const dynamic = "force-dynamic";

export const GET = withApiV1("refinery-terminals", async ({ db }) =>
  NextResponse.json(envelope(await listRefineryTerminals(db))),
);

export const OPTIONS = v1Options;
