import { CURRENT_PATCH_VERSION } from "@/lib/patch";

export type V1Envelope<T> = {
  data: T;
  meta: { patchVersion: string; generatedAt: string };
};

/**
 * Einheitlicher Antwort-Umschlag der v1: Nutzdaten plus Patch-Kontext,
 * damit Consumer stale Daten nach einem Game-Update erkennen können.
 */
export function envelope<T>(data: T): V1Envelope<T> {
  return {
    data,
    meta: {
      patchVersion: CURRENT_PATCH_VERSION,
      generatedAt: new Date().toISOString(),
    },
  };
}
