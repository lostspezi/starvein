import { NextResponse } from "next/server";
import { findAllOres } from "@/features/ores/ores.repository";
import { envelope } from "@/features/public-api/envelope";
import { v1Options, withApiV1 } from "@/features/public-api/with-api-v1";

export const dynamic = "force-dynamic";

export const GET = withApiV1("ores", async ({ db }) =>
  NextResponse.json(envelope(await findAllOres(db))),
);

export const OPTIONS = v1Options;
