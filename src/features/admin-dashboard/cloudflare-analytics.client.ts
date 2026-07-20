import { getRedis } from "@/lib/redis";
import { readJsonCapped, safeFetch } from "@/lib/safe-fetch";
import {
  seoAnalyticsSchema,
  type SeoAnalytics,
} from "./cloudflare-analytics.schema";

const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";
const CACHE_PREFIX = "cf-analytics:v1";
const CACHE_TTL_SECONDS = 900; // 15 min (CLAUDE.md §6.1)
const DAY_MS = 86_400_000;
const DEFAULT_DAYS = 30;
const TOP_LIMIT = 20;

type Env = Record<string, string | undefined>;

function emptyAnalytics(
  configured: boolean,
  unavailable: boolean,
): SeoAnalytics {
  return {
    configured,
    unavailable,
    totalPageViews: 0,
    countries: [],
    referrers: [],
    topPages: [],
    pageViews: [],
  };
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayRange(now: Date, days: number): string[] {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return Array.from({ length: days }, (_, i) =>
    dayKey(new Date(start.getTime() + i * DAY_MS)),
  );
}

function toViews(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

type RumGroup = { count?: unknown; dimensions?: Record<string, unknown> };

function mapDimension(
  groups: unknown,
  dimension: string,
): { label: string; views: number }[] {
  if (!Array.isArray(groups)) return [];
  return (groups as RumGroup[])
    .map((group) => ({
      label: toText(group?.dimensions?.[dimension]),
      views: toViews(group?.count),
    }))
    .filter((row) => row.label.length > 0);
}

/**
 * Wandelt die Cloudflare-GraphQL-Antwort (rumPageloadEventsAdaptiveGroups) in
 * das Dashboard-DTO. Defensiv: fehlt die erwartete Struktur oder meldet die API
 * `errors`, gilt das Ergebnis als „unavailable" statt zu werfen.
 */
export function mapRumResponse(
  json: unknown,
  now: Date,
  days = DEFAULT_DAYS,
): SeoAnalytics {
  const root = json as {
    errors?: unknown[];
    data?: { viewer?: { accounts?: unknown[] } };
  };
  if (Array.isArray(root?.errors) && root.errors.length > 0) {
    return emptyAnalytics(true, true);
  }
  const account = root?.data?.viewer?.accounts?.[0] as
    Record<string, unknown> | undefined;
  if (!account) return emptyAnalytics(true, true);

  const countries = mapDimension(account.countries, "countryName").map((r) => ({
    country: r.label,
    views: r.views,
  }));
  const referrers = mapDimension(account.referrers, "refererHost").map((r) => ({
    referrer: r.label,
    views: r.views,
  }));
  const topPages = mapDimension(account.topPages, "requestPath").map((r) => ({
    path: r.label,
    views: r.views,
  }));

  const dailyMap = new Map<string, number>();
  if (Array.isArray(account.daily)) {
    for (const group of account.daily as RumGroup[]) {
      const date = toText(group?.dimensions?.date).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        dailyMap.set(date, (dailyMap.get(date) ?? 0) + toViews(group?.count));
      }
    }
  }
  const pageViews = dayRange(now, days).map((date) => ({
    date,
    views: dailyMap.get(date) ?? 0,
  }));
  const totalPageViews = pageViews.reduce((sum, day) => sum + day.views, 0);

  return seoAnalyticsSchema.parse({
    configured: true,
    unavailable: false,
    totalPageViews,
    countries,
    referrers,
    topPages,
    pageViews,
  });
}

const RUM_QUERY = `
query Seo($accountTag: String!, $siteTag: String!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      countries: rumPageloadEventsAdaptiveGroups(limit: ${TOP_LIMIT}, filter: { siteTag: $siteTag, datetime_geq: $since, datetime_leq: $until }, orderBy: [count_DESC]) {
        count
        dimensions { countryName }
      }
      referrers: rumPageloadEventsAdaptiveGroups(limit: ${TOP_LIMIT}, filter: { siteTag: $siteTag, datetime_geq: $since, datetime_leq: $until, refererHost_neq: "" }, orderBy: [count_DESC]) {
        count
        dimensions { refererHost }
      }
      topPages: rumPageloadEventsAdaptiveGroups(limit: ${TOP_LIMIT}, filter: { siteTag: $siteTag, datetime_geq: $since, datetime_leq: $until }, orderBy: [count_DESC]) {
        count
        dimensions { requestPath }
      }
      daily: rumPageloadEventsAdaptiveGroups(limit: 1000, filter: { siteTag: $siteTag, datetime_geq: $since, datetime_leq: $until }, orderBy: [date_ASC]) {
        count
        dimensions { date }
      }
    }
  }
}`;

async function fetchRum(
  token: string,
  accountTag: string,
  siteTag: string,
  now: Date,
  days: number,
): Promise<unknown> {
  const until = now.toISOString();
  const since = new Date(now.getTime() - days * DAY_MS).toISOString();
  const response = await safeFetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: RUM_QUERY,
      variables: { accountTag, siteTag, since, until },
    }),
  });
  if (!response.ok) {
    throw new Error(`Cloudflare GraphQL failed: ${response.status}`);
  }
  return readJsonCapped<unknown>(response);
}

async function readCache(env: Env, key: string): Promise<SeoAnalytics | null> {
  if (!env.REDIS_URL) return null;
  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }
    const cached = await redis.get(key);
    if (!cached) return null;
    return seoAnalyticsSchema.parse(JSON.parse(cached));
  } catch {
    return null;
  }
}

async function writeCache(
  env: Env,
  key: string,
  value: SeoAnalytics,
): Promise<void> {
  if (!env.REDIS_URL) return;
  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }
    await redis.set(key, JSON.stringify(value), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Best effort — ein Redis-Ausfall darf das Dashboard nicht blockieren.
  }
}

/**
 * Holt die SEO-/Traffic-Kennzahlen aus Cloudflare Web Analytics. Fehlt Env
 * (Token/Account/Site-Tag) ⇒ `configured: false`; ein Abruf-/API-Fehler ⇒
 * `unavailable: true`. Ergebnisse werden 15 min in Redis gecacht (versionierter
 * Key), damit Seitenaufrufe nicht die Cloudflare-API rate-limiten.
 */
export async function getSeoAnalytics(
  env: Env = process.env,
  now: Date = new Date(),
  days: number = DEFAULT_DAYS,
): Promise<SeoAnalytics> {
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountTag = env.CLOUDFLARE_ACCOUNT_ID;
  const siteTag = env.CLOUDFLARE_RUM_SITE_TAG;
  if (!token || !accountTag || !siteTag) {
    return emptyAnalytics(false, false);
  }

  const key = `${CACHE_PREFIX}:${accountTag}:${siteTag}:${days}`;
  const cached = await readCache(env, key);
  if (cached) return cached;

  try {
    const mapped = mapRumResponse(
      await fetchRum(token, accountTag, siteTag, now, days),
      now,
      days,
    );
    if (!mapped.unavailable) {
      await writeCache(env, key, mapped);
    }
    return mapped;
  } catch {
    return emptyAnalytics(true, true);
  }
}
