import type { Db } from "mongodb";
import {
  registrationStatsSchema,
  type RegistrationStats,
} from "./registrations.schema";

const DAY_MS = 86_400_000;

/** YYYY-MM-DD (UTC) — Tages-Bucket-Schlüssel für die Zeitreihe. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Baut die lückenlose, aufsteigende Liste der letzten `days` Tage (UTC). */
function dayRange(now: Date, days: number): string[] {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return Array.from({ length: days }, (_, i) =>
    dayKey(new Date(start.getTime() + i * DAY_MS)),
  );
}

/**
 * Aggregiert die Registrierungs-Kennzahlen aus den Better-Auth-Collections
 * (`user`, `account`, `session`). `now` wird injiziert, damit Fenster/Zeitreihe
 * deterministisch testbar sind.
 */
export async function getRegistrationStats(
  db: Db,
  now: Date,
  options: { days?: number; recentLimit?: number } = {},
): Promise<RegistrationStats> {
  const days = options.days ?? 30;
  const recentLimit = options.recentLimit ?? 10;

  const since24h = new Date(now.getTime() - DAY_MS);
  const since7d = new Date(now.getTime() - 7 * DAY_MS);
  const since30d = new Date(now.getTime() - 30 * DAY_MS);
  const seriesStart = new Date(now);
  seriesStart.setUTCHours(0, 0, 0, 0);
  seriesStart.setUTCDate(seriesStart.getUTCDate() - (days - 1));

  const users = db.collection("user");
  const accounts = db.collection("account");
  const sessions = db.collection("session");

  const [
    totalUsers,
    newLast24h,
    newLast7d,
    newLast30d,
    activeSessions,
    providerRows,
    dailyRows,
    recentRows,
  ] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ createdAt: { $gte: since24h } }),
    users.countDocuments({ createdAt: { $gte: since7d } }),
    users.countDocuments({ createdAt: { $gte: since30d } }),
    sessions.countDocuments({ expiresAt: { $gt: now } }),
    accounts
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$providerId", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ])
      .toArray(),
    users
      .aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: seriesStart } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "UTC",
              },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    users
      .aggregate<{ name?: unknown; createdAt?: unknown; provider?: unknown }>([
        { $sort: { createdAt: -1 } },
        { $limit: recentLimit },
        {
          $lookup: {
            from: "account",
            localField: "_id",
            foreignField: "userId",
            as: "accounts",
          },
        },
        {
          $project: {
            _id: 0,
            name: 1,
            createdAt: 1,
            provider: { $arrayElemAt: ["$accounts.providerId", 0] },
          },
        },
      ])
      .toArray(),
  ]);

  const dailyMap = new Map(dailyRows.map((r) => [r._id, r.count]));
  const dailySignups = dayRange(now, days).map((date) => ({
    date,
    count: dailyMap.get(date) ?? 0,
  }));

  const recentSignups = recentRows.map((row) => ({
    name: typeof row.name === "string" ? row.name : "",
    provider: typeof row.provider === "string" ? row.provider : null,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt ?? ""),
  }));

  return registrationStatsSchema.parse({
    totalUsers,
    newLast24h,
    newLast7d,
    newLast30d,
    activeSessions,
    byProvider: providerRows.map((r) => ({ provider: r._id, count: r.count })),
    dailySignups,
    recentSignups,
  });
}
