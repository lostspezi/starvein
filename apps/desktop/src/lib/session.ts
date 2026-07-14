import { SERVER_URL } from "./config";
import { fetch } from "./http";

export type SessionUser = {
  id: string;
  name: string;
  image?: string | null;
};

/** Liest die Session zum Bearer-Token; null = Token ungültig/abgelaufen. */
export async function fetchSessionUser(
  token: string,
): Promise<SessionUser | null> {
  const response = await fetch(`${SERVER_URL}/api/auth/get-session`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return null;
  }
  const json = await response.json();
  return json?.user ?? null;
}

/**
 * Widerruft die Session serverseitig. Fehler werden geschluckt — das lokale
 * Löschen des Tokens (secrets.ts) ist der entscheidende Logout-Schritt.
 */
export async function revokeSession(token: string): Promise<void> {
  try {
    await fetch(`${SERVER_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: "{}",
    });
  } catch {
    // offline/Server weg — Token wird trotzdem lokal gelöscht
  }
}
