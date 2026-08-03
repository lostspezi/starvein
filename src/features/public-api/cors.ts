/**
 * CORS für die öffentliche Read-only-v1: jede Origin darf lesen, als
 * Credential-Header sind Authorization und X-Api-Key erlaubt. Preflight
 * ist key-frei — Browser senden im OPTIONS keine Credentials mit.
 */
const V1_CORS_HEADERS: Readonly<Record<string, string>> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Authorization, X-Api-Key, Content-Type",
  "access-control-max-age": "86400",
};

/** OPTIONS-Handler für alle /api/v1-Routen. */
export function v1Preflight(): Response {
  return new Response(null, { status: 204, headers: V1_CORS_HEADERS });
}

/** Ergänzt die CORS-Header auf einer bestehenden Response. */
export function withCors(response: Response): Response {
  for (const [name, value] of Object.entries(V1_CORS_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}
