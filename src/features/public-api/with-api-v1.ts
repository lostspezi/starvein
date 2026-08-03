import { NextResponse } from "next/server";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import { v1Preflight, withCors } from "./cors";
import { trackUsage } from "./usage-tracking";
import { checkV1RateLimit, rateLimitHeaders } from "./v1-rate-limit";
import { extractApiKey, verifyApiKey } from "./verify-key";

export type V1Context<P> = {
  request: Request;
  db: Db;
  keyId: string;
  userId: string;
  params: P;
};

export type V1Handler<P> = (context: V1Context<P>) => Promise<Response>;

function applyHeaders(
  response: Response,
  headers: Record<string, string>,
): Response {
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  return withCors(response);
}

/** OPTIONS-Export für jede v1-Route. */
export function v1Options(): Response {
  return v1Preflight();
}

/**
 * Gemeinsamer Unterbau aller /api/v1-Handler: Key-Pflicht (401), Redis-
 * Rate-Limit pro Key (429 + Retry-After), X-RateLimit- und CORS-Header
 * auf jeder Antwort, Fehler als flaches `{ error: "internal error" }`.
 *
 * `endpoint` ist der stabile Name fürs Usage-Tracking (z.B. "ores").
 */
export function withApiV1<P = Record<string, never>>(
  endpoint: string,
  handler: V1Handler<P>,
) {
  return async (
    request: Request,
    routeContext?: { params: Promise<P> },
  ): Promise<Response> => {
    const rawKey = extractApiKey(request.headers);
    const verified = rawKey ? await verifyApiKey(rawKey) : null;
    if (!verified) {
      return withCors(
        NextResponse.json({ error: "invalid api key" }, { status: 401 }),
      );
    }

    const track = (status: number) =>
      void trackUsage({
        keyId: verified.keyId,
        userId: verified.userId,
        endpoint,
        status,
      });

    const rate = await checkV1RateLimit(verified.keyId);
    if (!rate.allowed) {
      track(429);
      const retryAfter = Math.max(
        1,
        rate.resetEpochSeconds - Math.ceil(Date.now() / 1000),
      );
      return applyHeaders(
        NextResponse.json({ error: "rate limited" }, { status: 429 }),
        { ...rateLimitHeaders(rate), "retry-after": String(retryAfter) },
      );
    }

    let response: Response;
    try {
      response = await handler({
        request,
        db: await getDb(),
        keyId: verified.keyId,
        userId: verified.userId,
        params: (await routeContext?.params) as P,
      });
    } catch (error) {
      console.error(`[public-api] ${endpoint} failed:`, error);
      response = NextResponse.json(
        { error: "internal error" },
        { status: 500 },
      );
    }

    track(response.status);
    return applyHeaders(response, rateLimitHeaders(rate));
  };
}
