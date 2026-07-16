import type { Db } from "mongodb";
import { blueprintSchema } from "@/features/blueprints/blueprints.schema";
import {
  celestialBodySchema,
  starSystemSchema,
} from "@/features/locations/locations.schema";
import { oreSchema } from "@/features/ores/ores.schema";
import {
  matchSignatureValue,
  parseSignatureQuery,
  type GroundSignatureEntry,
  type ShipSignatureEntry,
} from "./signature-match";

export type SearchResult = {
  kind: "ore" | "system" | "body" | "blueprint" | "signature";
  /** Anzeigename */
  label: string;
  /**
   * Kontext für die Sublabel-Anzeige: rarityTier bei Erzen,
   * Body-Typ bei Himmelskörpern, "system" bei Systemen,
   * Kategorie bei Blueprints, Basis-Signatur bei Signatur-Treffern.
   */
  detail: string;
  href: string;
};

const DEFAULT_LIMIT = 8;

/**
 * Bei gleichem Prefix-Rang kommen die Kern-Entitäten (Erz, System, Körper)
 * vor Blueprints: der Wiki-Sync liefert über 1500 Blueprints und würde die
 * Vorschläge sonst dominieren. Ein Prefix-Treffer schlägt die Art weiterhin.
 */
function kindRank(kind: SearchResult["kind"]): number {
  return kind === "blueprint" ? 1 : 0;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Numerische Query = gescannter RS-Wert: gegen die Signatur-Referenz
 * auflösen (Basis × Cluster-Anzahl, siehe signature-match.ts).
 * Erz-Treffer verlinken das Erz, Ground-Treffer die Signatur-Referenz.
 */
async function searchSignatures(
  db: Db,
  value: number,
): Promise<SearchResult[]> {
  const noId = { projection: { _id: 0 } } as const;
  const profileDocs = await db
    .collection("signatureProfiles")
    .find({ signatureValue: { $exists: true } }, noId)
    .toArray();

  const shipProfiles = profileDocs.filter((doc) => doc.method === "ship");
  const oreDocs = await db
    .collection("ores")
    .find(
      { code: { $in: shipProfiles.map((doc) => doc.oreCode) } },
      { projection: { _id: 0, code: 1, name_en: 1 } },
    )
    .toArray();
  const oreNames = new Map(
    oreDocs.map((doc) => [doc.code as string, doc.name_en as string]),
  );

  const ship: ShipSignatureEntry[] = shipProfiles.map((doc) => ({
    oreCode: doc.oreCode as string,
    oreName: oreNames.get(doc.oreCode as string) ?? (doc.oreCode as string),
    signatureValue: doc.signatureValue as number,
  }));

  // ROC/FPS teilen sich größenbasierte Werte — auf Distinct reduzieren
  const ground: GroundSignatureEntry[] = [
    ...new Map(
      profileDocs
        .filter((doc) => doc.method === "roc" || doc.method === "fps")
        .map((doc) => [
          `${doc.method}|${doc.signatureValue}`,
          {
            method: doc.method as "roc" | "fps",
            signatureValue: doc.signatureValue as number,
          },
        ]),
    ).values(),
  ];

  return matchSignatureValue(value, ship, ground).map((match) => ({
    kind: "signature" as const,
    label:
      match.type === "ore"
        ? `${match.count} × ${match.oreName}`
        : `${match.count} × ${match.method.toUpperCase()}`,
    detail: String(match.signatureValue),
    href:
      match.type === "ore"
        ? `/ores/${match.oreCode.toLowerCase()}`
        : "/signatures",
  }));
}

export async function searchAll(
  db: Db,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  // Numerische Queries zuerst als Signatur-Wert interpretieren
  const signatureValue = parseSignatureQuery(trimmed);
  const signatureResults =
    signatureValue !== null ? await searchSignatures(db, signatureValue) : [];

  const contains = new RegExp(escapeRegex(trimmed), "i");
  const noId = { projection: { _id: 0 } } as const;

  const [oreDocs, systemDocs, bodyDocs, blueprintDocs] = await Promise.all([
    db
      .collection("ores")
      .find(
        {
          $or: [
            { name_en: contains },
            { name_de: contains },
            { code: contains },
          ],
        },
        noId,
      )
      .sort({ name_en: 1 })
      .limit(limit)
      .toArray(),
    db
      .collection("starSystems")
      .find({ $or: [{ name: contains }, { code: contains }] }, noId)
      .sort({ name: 1 })
      .limit(limit)
      .toArray(),
    db
      .collection("celestialBodies")
      .find({ name: contains }, noId)
      .sort({ name: 1 })
      .limit(limit)
      .toArray(),
    // Gesucht wird über das erzeugte Item und den Wiki-Key; der outputType
    // bleibt außen vor (er würde bei "radar" & Co. die Liste fluten — dafür
    // gibt es den Kategorie-Filter auf /blueprints).
    db
      .collection("blueprints")
      .find({ $or: [{ outputName: contains }, { key: contains }] }, noId)
      .sort({ outputName: 1 })
      .limit(limit)
      .toArray(),
  ]);

  const results: SearchResult[] = [
    ...systemDocs.map((doc) => {
      const system = starSystemSchema.parse(doc);
      return {
        kind: "system" as const,
        label: system.name,
        detail: "system",
        href: `/locations/${system.code.toLowerCase()}`,
      };
    }),
    ...bodyDocs.map((doc) => {
      const body = celestialBodySchema.parse(doc);
      return {
        kind: "body" as const,
        label: body.name,
        detail: body.type,
        href: `/locations/${body.systemCode.toLowerCase()}/${body.slug}`,
      };
    }),
    ...oreDocs.map((doc) => {
      const ore = oreSchema.parse(doc);
      return {
        kind: "ore" as const,
        label: ore.name_en,
        detail: ore.rarityTier,
        href: `/ores/${ore.code.toLowerCase()}`,
      };
    }),
    ...blueprintDocs.map((doc) => {
      const blueprint = blueprintSchema.parse(doc);
      return {
        kind: "blueprint" as const,
        label: blueprint.outputName,
        detail: blueprint.category,
        href: `/blueprints/${blueprint.slug}`,
      };
    }),
  ];

  // Treffer am Wortanfang vor reinen Substring-Treffern, dann Kern-Entitäten
  // vor Blueprints, dann alphabetisch
  const startsWith = new RegExp(`^${escapeRegex(trimmed)}`, "i");
  results.sort((a, b) => {
    const aPrefix = startsWith.test(a.label) ? 0 : 1;
    const bPrefix = startsWith.test(b.label) ? 0 : 1;
    return (
      aPrefix - bPrefix ||
      kindRank(a.kind) - kindRank(b.kind) ||
      a.label.localeCompare(b.label)
    );
  });

  // Signatur-Treffer immer zuoberst — bei numerischen Queries sind sie
  // die wahrscheinlichste Intention
  return [...signatureResults, ...results].slice(0, limit);
}
