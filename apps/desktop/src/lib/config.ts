/**
 * Basis-URL des STARVEIN-Backends. Für lokale Entwicklung per
 * VITE_STARVEIN_SERVER_URL übersteuerbar (z. B. http://localhost:3000);
 * ein Settings-UI folgt in Slice D6.
 */
export const SERVER_URL: string =
  import.meta.env.VITE_STARVEIN_SERVER_URL ?? "https://starvein.app";
