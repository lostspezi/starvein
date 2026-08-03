/**
 * Zentrale HTTP-Security-Header (in next.config.ts verdrahtet). Ergänzt die
 * Header, die zusätzlich am Reverse-Proxy (Caddy, u. a. HSTS) gesetzt werden
 * — Defense in Depth, damit die Header auch ohne Caddy (lokal, andere
 * Deployments) greifen.
 *
 * CSP-Entscheidung: statische Policy mit `'unsafe-inline'` für Scripts (Next.js
 * injiziert Inline-Bootstrap-Scripts; ohne Nonce ist das der funktionierende
 * Baseline). Nonce-basierte CSP ist strenger, erfordert aber tiefe Next-/
 * next-intl-Integration und visuelle Verifikation (WebGL-Starfield,
 * Hydration) — als Folgeschritt vorgemerkt. Die CSP wird nur in Produktion
 * gesetzt: der Dev-Server (Turbopack/HMR) benötigt `'unsafe-eval'`.
 */

export interface HttpHeader {
  key: string;
  value: string;
}

/** Erlaubte Fremd-Origins, abgeleitet aus dem tatsächlichen Feature-Set. */
const IMG_SRCS = [
  "'self'",
  "data:",
  "blob:",
  "https://cdn.discordapp.com", // Discord-Avatare
  "https://i.ytimg.com", // YouTube-Thumbnails
];

const FRAME_SRCS = [
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
]; // eingebettete Guide-Videos (TipTap-YouTube-Extension)

// Cloudflare Web Analytics: der Proxy injiziert beacon.min.js automatisch;
// das Beacon lädt von static.cloudflareinsights.com und POSTet RUM-Events
// nach cloudflareinsights.com — ohne beide Origins liefert das SEO-Panel
// im Admin-Dashboard keine Daten.
const SCRIPT_SRCS = [
  "'self'",
  "'unsafe-inline'",
  "https://static.cloudflareinsights.com",
];

const CONNECT_SRCS = ["'self'", "https://cloudflareinsights.com"];

export function buildContentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${SCRIPT_SRCS.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${IMG_SRCS.join(" ")}`,
    "font-src 'self'",
    `connect-src ${CONNECT_SRCS.join(" ")}`,
    `frame-src ${FRAME_SRCS.join(" ")}`,
    "worker-src 'self' blob:",
  ].join("; ");
}

export function buildSecurityHeaders(isProduction: boolean): HttpHeader[] {
  const headers: HttpHeader[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value: "geolocation=(), microphone=(), camera=(), browsing-topics=()",
    },
  ];

  // HSTS setzt der TLS-terminierende Caddy (siehe Caddyfile); CSP nur in Prod,
  // damit der Dev-Server nicht an fehlendem 'unsafe-eval' scheitert.
  if (isProduction) {
    headers.push({
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(),
    });
  }

  return headers;
}
