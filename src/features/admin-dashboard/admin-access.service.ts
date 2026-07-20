import type { Db } from "mongodb";
import { isAdminDiscordId, parseAdminDiscordIds } from "./admin-access";
import { resolveDiscordAccountId } from "./admin-access.repository";

/**
 * Entscheidet, ob der angemeldete User (Better-Auth-User-Id) Dashboard-Admin
 * ist: seine verknüpfte Discord-ID muss in `ADMIN_DISCORD_IDS` stehen.
 * Fail-closed und ohne DB-Zugriff, wenn die Allowlist leer ist.
 */
export async function isDashboardAdminUser(
  db: Db,
  userId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const ids = parseAdminDiscordIds(env);
  if (ids.size === 0) return false;

  const discordId = await resolveDiscordAccountId(db, userId);
  return isAdminDiscordId(discordId, ids);
}
