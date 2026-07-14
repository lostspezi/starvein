/**
 * Basis-URL des STARVEIN-Backends. Priorität: Settings (Slice D6) →
 * VITE_STARVEIN_SERVER_URL (lokale Entwicklung) → Produktions-Default.
 */
const DEFAULT_SERVER_URL: string =
  import.meta.env.VITE_STARVEIN_SERVER_URL ?? "https://starvein.app";

let serverUrl = DEFAULT_SERVER_URL;

export function getServerUrl(): string {
  return serverUrl;
}

/** Leerer/whitespace-Wert setzt auf den Default zurück. */
export function setServerUrl(url: string | null): void {
  const trimmed = url?.trim().replace(/\/+$/, "") ?? "";
  serverUrl = trimmed.length > 0 ? trimmed : DEFAULT_SERVER_URL;
}
