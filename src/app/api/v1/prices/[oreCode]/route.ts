import { NextResponse } from "next/server";
import { findOreByCode } from "@/features/ores/ores.repository";
import { envelope } from "@/features/public-api/envelope";
import { v1Options, withApiV1 } from "@/features/public-api/with-api-v1";
import { getCachedOrePriceSummary } from "@/features/refinery-and-prices/price-summary";

export const dynamic = "force-dynamic";

export const GET = withApiV1<{ oreCode: string }>(
  "prices/{oreCode}",
  async ({ db, params }) => {
    // Preis-Daten sind per Erz-Code gekeyt — unbekannte Codes sauber 404en,
    // statt leere Summaries zu liefern
    const ore = await findOreByCode(db, params.oreCode);
    if (!ore) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(
      envelope(await getCachedOrePriceSummary(db, params.oreCode)),
    );
  },
);

export const OPTIONS = v1Options;
