import { z } from "zod";
import { oreSchema, type Ore } from "@starvein/shared/ores";
import {
  refineryMethodSchema,
  refineryTerminalSchema,
  type RefineryMethod,
  type RefineryTerminal,
} from "@starvein/shared/refinery-catalog";
import {
  refineryJobSchema,
  type RefineryJob,
  type RefineryJobInput,
} from "@starvein/shared/refinery-jobs";
import { SERVER_URL } from "./config";
import { fetch } from "./http";

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`API request failed with ${status}`);
    this.name = "ApiError";
  }
}

async function getJson<T>(
  path: string,
  token: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(`${SERVER_URL}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return schema.parse(await response.json());
}

export async function fetchOwnJobs(token: string): Promise<RefineryJob[]> {
  return getJson("/api/refinery-jobs", token, z.array(refineryJobSchema));
}

async function getPublicJson<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(`${SERVER_URL}${path}`);
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return schema.parse(await response.json());
}

export async function fetchOres(): Promise<Ore[]> {
  return getPublicJson("/api/ores", z.array(oreSchema));
}

export async function fetchRefineryTerminals(): Promise<RefineryTerminal[]> {
  return getPublicJson(
    "/api/refinery-terminals",
    z.array(refineryTerminalSchema),
  );
}

export async function fetchRefineryMethods(): Promise<RefineryMethod[]> {
  return getPublicJson("/api/refinery-methods", z.array(refineryMethodSchema));
}

export async function createRefineryJob(
  token: string,
  input: RefineryJobInput,
): Promise<RefineryJob> {
  const response = await fetch(`${SERVER_URL}/api/refinery-jobs`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return refineryJobSchema.parse(await response.json());
}
