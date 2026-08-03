import { NextResponse } from "next/server";
import { getCachedTickerEntries } from "@/features/price-ticker/ticker.service";
import { envelope } from "@/features/public-api/envelope";
import { v1Options, withApiV1 } from "@/features/public-api/with-api-v1";

export const dynamic = "force-dynamic";

export const GET = withApiV1("prices/ticker", async ({ db }) =>
  NextResponse.json(envelope(await getCachedTickerEntries(db))),
);

export const OPTIONS = v1Options;
