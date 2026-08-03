import { NextResponse } from "next/server";
import { findAllStarSystems } from "@/features/locations/locations.repository";
import { envelope } from "@/features/public-api/envelope";
import { v1Options, withApiV1 } from "@/features/public-api/with-api-v1";

export const dynamic = "force-dynamic";

export const GET = withApiV1("star-systems", async ({ db }) =>
  NextResponse.json(envelope(await findAllStarSystems(db))),
);

export const OPTIONS = v1Options;
