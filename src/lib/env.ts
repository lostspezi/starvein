/**
 * Boot-Zeit-Validierung der server-seitigen Env-Vars. Ziel: fehlende oder
 * schwache/Platzhalter-Secrets in Produktion sofort beim Start auffallen
 * lassen — nicht erst, wenn zur Laufzeit ein Login/Sync fehlschlägt.
 *
 * Bewusst eine reine Funktion über einem übergebenen Env-Record (kein
 * eingefrorener Snapshot): die bestehenden Lazy-Getter (db.ts, redis.ts …)
 * und die Tests, die `process.env.*` dynamisch setzen, bleiben unangetastet.
 */

export interface EnvIssue {
  key: string;
  message: string;
}

export interface EnvValidationResult {
  ok: boolean;
  issues: EnvIssue[];
}

/** In Prod verbotene, offensichtliche Platzhalter (u. a. `.env.example`). */
const PLACEHOLDER = /^(change-?me|changeit|secret|password|todo|xxx+)$/i;

/** Mindestlänge für „echte" Secrets in Produktion. */
const MIN_SECRET_LENGTH = 16;

/**
 * Boot-kritisch: ohne diese kann der Server nicht sinnvoll laufen. SYNC_SECRET
 * ist bewusst NICHT dabei — die Sync-Routen sind fail-closed (401 ohne Secret),
 * ein Deployment ohne Sync-Cron darf trotzdem starten. Es wird aber, falls
 * gesetzt, auf Stärke geprüft (SECRET_KEYS).
 */
const REQUIRED_KEYS = [
  "MONGODB_URI",
  "REDIS_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
] as const;

/** Hoch-sensible Secrets, die in Prod nicht schwach/Platzhalter sein dürfen. */
const SECRET_KEYS = ["BETTER_AUTH_SECRET", "SYNC_SECRET"] as const;

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

export function validateServerEnv(
  env: Record<string, string | undefined> = process.env,
  nodeEnv: string = process.env.NODE_ENV ?? "development",
): EnvValidationResult {
  const issues: EnvIssue[] = [];
  const isProd = nodeEnv === "production";

  for (const key of REQUIRED_KEYS) {
    if (isBlank(env[key])) {
      issues.push({ key, message: "is required but missing/empty" });
    }
  }

  const authUrl = env.BETTER_AUTH_URL;
  if (!isBlank(authUrl) && !isValidUrl(authUrl!)) {
    issues.push({ key: "BETTER_AUTH_URL", message: "must be a valid URL" });
  }

  // Secret-Härte nur in Produktion erzwingen — lokale Dev/Test-Umgebungen
  // dürfen die `.env.example`-Platzhalter behalten.
  if (isProd) {
    for (const key of SECRET_KEYS) {
      const value = env[key];
      if (isBlank(value)) continue; // schon oben als „missing" erfasst
      if (PLACEHOLDER.test(value!.trim())) {
        issues.push({
          key,
          message: "must not be a placeholder value in production",
        });
      } else if (value!.length < MIN_SECRET_LENGTH) {
        issues.push({
          key,
          message: `must be at least ${MIN_SECRET_LENGTH} characters in production`,
        });
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wirft mit einer gesammelten, lesbaren Fehlermeldung, wenn die Env ungültig
 * ist. Wird beim Server-Start (instrumentation.ts) aufgerufen.
 */
export function assertServerEnv(
  env: Record<string, string | undefined> = process.env,
  nodeEnv: string = process.env.NODE_ENV ?? "development",
): void {
  const { ok, issues } = validateServerEnv(env, nodeEnv);
  if (ok) return;
  const lines = issues.map((issue) => `  - ${issue.key}: ${issue.message}`);
  throw new Error(
    `Invalid server environment configuration:\n${lines.join("\n")}`,
  );
}
