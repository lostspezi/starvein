import { ObjectId, type Db } from "mongodb";

const ACCOUNT_COLLECTION = "account";
const DISCORD_PROVIDER = "discord";

/**
 * Löst die Discord-User-ID (das `accountId` des Providers "discord") zum
 * angemeldeten Better-Auth-User auf. Der Mongo-Adapter speichert
 * `account.userId` als ObjectId (Referenz auf `user._id`); zur Robustheit
 * gegen abweichende Alt-/Konfig-Daten wird zusätzlich die String-Form geprüft.
 * Gibt null zurück, wenn der User keinen verknüpften Discord-Account hat.
 */
export async function resolveDiscordAccountId(
  db: Db,
  userId: string,
): Promise<string | null> {
  const userIdForms: unknown[] = [userId];
  if (ObjectId.isValid(userId)) {
    userIdForms.push(new ObjectId(userId));
  }

  const doc = await db
    .collection(ACCOUNT_COLLECTION)
    .findOne(
      { userId: { $in: userIdForms }, providerId: DISCORD_PROVIDER },
      { projection: { accountId: 1 } },
    );

  const accountId =
    typeof doc?.accountId === "string" ? doc.accountId.trim() : "";
  return accountId.length > 0 ? accountId : null;
}
