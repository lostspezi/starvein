import { z } from "zod";
import { createDocument, type ZodOpenApiOperationObject } from "zod-openapi";
import { oreOccurrenceSchema } from "@/features/ore-occurrences/ore-occurrences.schema";
import { MINING_METHODS, oreSchema } from "@/features/ores/ores.schema";
import {
  celestialBodySchema,
  starSystemSchema,
} from "@/features/locations/locations.schema";
import {
  priceSnapshotSchema,
  refineryMethodSchema,
  refineryYieldSchema,
} from "@/features/refinery-and-prices/refinery-and-prices.schema";
import { refineryTerminalSchema } from "@starvein/shared/refinery-catalog";
import { signatureProfileSchema } from "@/features/signature-profiles/signature-profiles.schema";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { DEPOSIT_TYPES } from "@/features/ore-occurrences/ore-occurrences.schema";

const SECURITY: Record<string, string[]>[] = [
  { bearerAuth: [] },
  { apiKeyHeader: [] },
];

const errorSchema = z
  .object({ error: z.string() })
  .meta({ id: "ErrorResponse", description: "Flat error body" });

const metaSchema = z.object({
  patchVersion: z
    .string()
    .meta({ description: "Star Citizen patch the data refers to" }),
  generatedAt: z.iso.datetime(),
});

function envelopeOf(inner: z.ZodType, description: string) {
  return z.object({ data: inner, meta: metaSchema }).meta({ description });
}

const priceSideSchema = z
  .object({
    bestSell: priceSnapshotSchema.nullable(),
    topSellTerminals: z.array(priceSnapshotSchema),
  })
  .nullable();

const priceSummarySchema = z.object({
  raw: priceSideSchema,
  refined: priceSideSchema,
  syncedAt: z.string().nullable(),
});

const tickerEntrySchema = z.object({
  oreCode: z.string(),
  nameDe: z.string(),
  nameEn: z.string(),
  bestSell: z.number(),
  prevClose: z.number().nullable(),
  direction: z.enum(["up", "down", "same"]).nullable(),
  changePercent: z.number().nullable(),
  sellTerminals: z.array(z.string()),
  sellTerminalCount: z.number(),
});

const methodQuery = z
  .enum(MINING_METHODS)
  .optional()
  .meta({ description: "Filter by mining method" });

function operation(
  summary: string,
  dataSchema: z.ZodType,
  options: {
    requestParams?: ZodOpenApiOperationObject["requestParams"];
    notFound?: boolean;
    badRequest?: boolean;
  } = {},
): ZodOpenApiOperationObject {
  const responses: ZodOpenApiOperationObject["responses"] = {
    "200": {
      description: "OK",
      content: {
        "application/json": { schema: envelopeOf(dataSchema, summary) },
      },
    },
    "401": {
      description: "Missing or invalid API key",
      content: { "application/json": { schema: errorSchema } },
    },
    "429": {
      description: "Rate limit exceeded (120 requests/minute per key)",
      content: { "application/json": { schema: errorSchema } },
    },
  };
  if (options.badRequest) {
    responses["400"] = {
      description: "Invalid query parameters",
      content: { "application/json": { schema: errorSchema } },
    };
  }
  if (options.notFound) {
    responses["404"] = {
      description: "Not found",
      content: { "application/json": { schema: errorSchema } },
    };
  }
  return {
    summary,
    security: [...SECURITY],
    requestParams: options.requestParams,
    responses,
  };
}

/**
 * OpenAPI-3.1-Dokument der öffentlichen v1, generiert aus denselben
 * Zod-Schemas, die auch die Runtime validiert. Wird einmal pro Prozess
 * gebaut (siehe openapi.json-Route).
 */
export function buildOpenApiDocument() {
  return createDocument({
    openapi: "3.1.0",
    info: {
      title: "STARVEIN Community API",
      version: "1.0.0",
      description: [
        "Read-only reference data for Star Citizen mining: ores,",
        "occurrence probabilities, scan signatures, locations, refinery",
        "yields and prices.",
        "",
        `Current game patch: ${CURRENT_PATCH_VERSION}.`,
        "",
        "Every endpoint (except this spec) requires a free API key —",
        "create one at /account/api-keys after signing in. Send it as",
        "`Authorization: Bearer sv_…` or `x-api-key: sv_…`.",
        "",
        "Rate limit: 120 requests/minute per key; every response carries",
        "X-RateLimit-Limit/-Remaining/-Reset headers.",
        "",
        "Responses are wrapped in `{ data, meta }` — `meta.patchVersion`",
        "tells you which game patch the data belongs to. Datasets are",
        "small and unpaginated; pagination would be added additively.",
      ].join("\n"),
    },
    servers: [{ url: "/api/v1" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "API key as bearer token (sv_…)",
        },
        apiKeyHeader: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API key header (sv_…)",
        },
      },
    },
    paths: {
      "/ores": {
        get: operation("List all mineable ores", z.array(oreSchema)),
      },
      "/ores/{code}": {
        get: operation("Get a single ore by its 4-letter code", oreSchema, {
          requestParams: {
            path: z.object({
              code: z.string().meta({ example: "QUAN" }),
            }),
          },
          notFound: true,
        }),
      },
      "/ore-occurrences": {
        get: operation(
          "List ore occurrences with probabilities per location and method",
          z.array(oreOccurrenceSchema),
          {
            requestParams: {
              query: z.object({
                ore: z.string().optional().meta({ example: "BEXA" }),
                system: z.string().optional().meta({ example: "STANTON" }),
                method: methodQuery,
                deposit: z.enum(DEPOSIT_TYPES).optional(),
              }),
            },
            badRequest: true,
          },
        ),
      },
      "/signatures": {
        get: operation(
          "List scan signature profiles (ship: identifies the mineral; ROC/FPS: cluster size only)",
          z.array(signatureProfileSchema),
          {
            requestParams: { query: z.object({ method: methodQuery }) },
            badRequest: true,
          },
        ),
      },
      "/star-systems": {
        get: operation("List star systems", z.array(starSystemSchema)),
      },
      "/star-systems/{code}": {
        get: operation("Get a star system", starSystemSchema, {
          requestParams: {
            path: z.object({
              code: z.string().meta({ example: "STANTON" }),
            }),
          },
          notFound: true,
        }),
      },
      "/star-systems/{code}/bodies": {
        get: operation(
          "List celestial bodies of a star system",
          z.array(celestialBodySchema),
          {
            requestParams: {
              path: z.object({
                code: z.string().meta({ example: "STANTON" }),
              }),
            },
            notFound: true,
          },
        ),
      },
      "/refinery-methods": {
        get: operation("List refinery methods", z.array(refineryMethodSchema)),
      },
      "/refinery-terminals": {
        get: operation(
          "List refinery terminals",
          z.array(refineryTerminalSchema),
        ),
      },
      "/refinery-yields": {
        get: operation(
          "List refinery yield bonuses for an ore",
          z.array(refineryYieldSchema),
          {
            requestParams: {
              query: z.object({
                ore: z.string().meta({ example: "BEXA" }),
              }),
            },
            badRequest: true,
          },
        ),
      },
      "/prices/{oreCode}": {
        get: operation(
          "Price summary (raw/refined) for an ore",
          priceSummarySchema,
          {
            requestParams: {
              path: z.object({
                oreCode: z.string().meta({ example: "BEXA" }),
              }),
            },
            notFound: true,
          },
        ),
      },
      "/prices/ticker": {
        get: operation(
          "Best refined sell price per ore with day-over-day change",
          z.array(tickerEntrySchema),
        ),
      },
      "/openapi.json": {
        get: {
          summary: "This OpenAPI document (no key required)",
          security: [],
          responses: {
            "200": {
              description: "OpenAPI 3.1 document",
              content: { "application/json": {} },
            },
          },
        },
      },
    },
  });
}
