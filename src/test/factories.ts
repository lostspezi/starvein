/**
 * Wortwörtlicher Pflicht-Disclaimer laut RSI-Fansite-Policy (CLAUDE.md §2).
 * Unit- und E2E-Tests asserten exakt diesen String — niemals ändern.
 */
export const FAN_DISCLAIMER_TEXT =
  "This is an unofficial Star Citizen fansite, not affiliated with the Cloud Imperium group of companies. All content on this site not authored by its host or users are property of their respective owners.";

export const RSI_URL = "https://robertsspaceindustries.com";

let dbCounter = 0;

/** Eindeutiger DB-Name pro Test-Suite gegen gegenseitige Störungen. */
export function uniqueDbName(prefix = "test") {
  dbCounter += 1;
  return `${prefix}-${process.pid}-${dbCounter}`;
}
