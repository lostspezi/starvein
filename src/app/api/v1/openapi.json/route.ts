import { NextResponse } from "next/server";
import { withCors } from "@/features/public-api/cors";
import { buildOpenApiDocument } from "@/features/public-api/openapi";
import { enforceReadRateLimit } from "@/lib/read-rate-limit";

export const dynamic = "force-dynamic";

// Einmal pro Prozess bauen — das Dokument ist statisch.
let cachedDocument: ReturnType<typeof buildOpenApiDocument> | null = null;

/**
 * Bewusst key-frei: Entwickler sollen die Doku lesen können, bevor sie
 * sich registrieren. Backstop ist das IP-Limit der offenen Reads.
 */
export async function GET(request: Request) {
  const limited = await enforceReadRateLimit(request, "openapi");
  if (limited) return withCors(limited);

  cachedDocument ??= buildOpenApiDocument();
  return withCors(NextResponse.json(cachedDocument));
}
