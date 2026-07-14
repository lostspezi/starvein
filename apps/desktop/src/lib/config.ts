/**
 * Basis-URL des STARVEIN-Backends. Priorität: Settings (Slice D6) →
 * VITE_STARVEIN_SERVER_URL (lokale Entwicklung) → Produktions-Default.
 */
const DEFAULT_SERVER_URL: string =
  import.meta.env.VITE_STARVEIN_SERVER_URL ?? "https://starvein.app";

/**
 * Im Release-Build (tauri build) ist der Server fest auf die offizielle
 * Instanz gepinnt: kein Settings-Feld, gespeicherte Werte werden ignoriert.
 * Nur Dev-Builds (tauri dev) dürfen den Server umkonfigurieren.
 */
export function isServerUrlLocked(): boolean {
  return import.meta.env.PROD;
}

let serverUrl = DEFAULT_SERVER_URL;

export function getServerUrl(): string {
  return isServerUrlLocked() ? DEFAULT_SERVER_URL : serverUrl;
}

/** Leerer/whitespace-Wert setzt auf den Default zurück; im Release no-op. */
export function setServerUrl(url: string | null): void {
  if (isServerUrlLocked()) {
    return;
  }
  const trimmed = url?.trim().replace(/\/+$/, "") ?? "";
  serverUrl = trimmed.length > 0 ? trimmed : DEFAULT_SERVER_URL;
}
