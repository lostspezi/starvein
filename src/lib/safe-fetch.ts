/**
 * Gehärteter fetch-Wrapper für ausgehende Requests an externe APIs (UEX,
 * SC-Wiki). Zwei Schutzmechanismen gegen einen langsamen oder übergroßen
 * Upstream, der sonst den aufrufenden Request-Handler / Sync-Job aufhängen
 * oder den Speicher sprengen könnte:
 *
 *  - `safeFetch`: harter Timeout je Request via `AbortSignal.timeout`.
 *  - `readJsonCapped`: liest den Body mit Byte-Budget; verwirft zu große
 *    Antworten früh (Content-Length) bzw. spätestens beim Streamen.
 */

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_BYTES = 16 * 1024 * 1024; // 16 MiB

export interface SafeFetchInit extends RequestInit {
  timeoutMs?: number;
}

export async function safeFetch(
  url: string,
  init: SafeFetchInit = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const merged = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;
  return fetch(url, { ...rest, signal: merged });
}

export async function readJsonCapped<T>(
  response: Response,
  maxBytes = DEFAULT_MAX_BYTES,
): Promise<T> {
  // Schneller Ausstieg, wenn der Upstream eine zu große Länge ankündigt.
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    const size = Number(declared);
    if (Number.isFinite(size) && size > maxBytes) {
      throw new Error(
        `response body too large: ${size} bytes exceeds cap of ${maxBytes}`,
      );
    }
  }

  const body = response.body;
  if (!body) {
    // Kein Stream (z. B. manche Test-/Polyfill-Umgebungen): Text mit Cap lesen.
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) {
      throw new Error(`response body exceeded cap of ${maxBytes} bytes`);
    }
    return JSON.parse(text) as T;
  }

  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`response body exceeded cap of ${maxBytes} bytes`);
    }
    chunks.push(Buffer.from(value));
  }

  return JSON.parse(Buffer.concat(chunks, total).toString("utf8")) as T;
}
