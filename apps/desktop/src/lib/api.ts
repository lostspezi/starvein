import { z } from "zod";
import {
  refineryJobSchema,
  type RefineryJob,
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
