import type { Db } from "mongodb";
import type { MiningMethod } from "@/features/ores/ores.schema";
import { CACHE_TAGS, cachedQuery } from "@/lib/data-cache";
import {
  signatureProfileSchema,
  type SignatureProfile,
} from "./signature-profiles.schema";

const COLLECTION = "signatureProfiles";
const NO_ID = { projection: { _id: 0 } } as const;

/** Für Seiten-Reads: gecachte Variante (Tag wiki-data, siehe data-cache.ts). */
export function findAllSignatureProfilesCached(
  db: Db,
  method?: MiningMethod | null,
): Promise<SignatureProfile[]> {
  return cachedQuery(CACHE_TAGS.wiki, ["signature-profiles", method], () =>
    findAllSignatureProfiles(db, method),
  );
}

export async function findAllSignatureProfiles(
  db: Db,
  method?: MiningMethod | null,
): Promise<SignatureProfile[]> {
  const filter: Record<string, unknown> = {};
  if (method) filter.method = method;

  const docs = await db
    .collection(COLLECTION)
    .find(filter, NO_ID)
    .sort({ signatureValue: 1, oreCode: 1 })
    .toArray();
  return docs.map((doc) => signatureProfileSchema.parse(doc));
}

export async function findSignatureProfilesByOre(
  db: Db,
  oreCode: string,
): Promise<SignatureProfile[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ oreCode }, NO_ID)
    .sort({ method: 1 })
    .toArray();
  return docs.map((doc) => signatureProfileSchema.parse(doc));
}

export async function upsertSignatureProfiles(
  db: Db,
  profiles: SignatureProfile[],
): Promise<void> {
  if (profiles.length === 0) return;

  await db.collection(COLLECTION).bulkWrite(
    profiles.map((profile) => ({
      updateOne: {
        filter: {
          oreCode: profile.oreCode,
          method: profile.method,
          patchVersion: profile.patchVersion,
        },
        update: { $set: profile },
        upsert: true,
      },
    })),
  );
}
