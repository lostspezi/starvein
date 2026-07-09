import { pingMongo } from "@/lib/db";
import { pingRedis } from "@/lib/redis";

const PING_TIMEOUT_MS = 500;

export type ServiceState = "up" | "down";

export type HealthReport = {
  status: "ok" | "degraded";
  services: {
    app: ServiceState;
    mongo: ServiceState;
    redis: ServiceState;
  };
};

export async function checkHealth(): Promise<HealthReport> {
  const [mongo, redis] = await Promise.all([
    pingMongo(PING_TIMEOUT_MS),
    pingRedis(PING_TIMEOUT_MS),
  ]);

  const services = { app: "up" as const, mongo, redis };
  const allUp = Object.values(services).every((state) => state === "up");

  return { status: allUp ? "ok" : "degraded", services };
}
