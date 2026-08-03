import { NextResponse } from "next/server";
import {
  findBodiesBySystem,
  findStarSystemByCode,
} from "@/features/locations/locations.repository";
import { envelope } from "@/features/public-api/envelope";
import { v1Options, withApiV1 } from "@/features/public-api/with-api-v1";

export const dynamic = "force-dynamic";

export const GET = withApiV1<{ code: string }>(
  "star-systems/{code}/bodies",
  async ({ db, params }) => {
    const system = await findStarSystemByCode(db, params.code);
    if (!system) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(
      envelope(await findBodiesBySystem(db, params.code)),
    );
  },
);

export const OPTIONS = v1Options;
