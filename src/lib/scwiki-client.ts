/**
 * Dünner Client für die Star Citizen Wiki API v3 (verifiziert 2026-07-16).
 * Quelle für Crafting-Blueprints, Mineables (Erze inkl. Signaturen und
 * Fundwahrscheinlichkeiten) und Starmap-Locations — alles direkt aus den
 * Spieldaten. UEX bleibt nur für Preise/Refinery zuständig.
 *
 * Öffentliche Endpunkte brauchen keinen Key. Basis-URL überschreibbar für Tests.
 * Doku: https://docs.star-citizen.wiki
 */
import { readJsonCapped, safeFetch } from "@/lib/safe-fetch";

function baseUrl(): string {
  return process.env.SCWIKI_API_BASE_URL ?? "https://api.star-citizen.wiki";
}

/** Maximale Seitengröße laut API-Doku. */
const PAGE_SIZE = 200;
/** Backstop gegen Endlos-Pagination bei API-Fehlverhalten. */
const MAX_PAGES = 100;

async function fetchJson<T>(path: string): Promise<T> {
  // safeFetch (Timeout) + readJsonCapped (Byte-Cap): ein hängender oder
  // übergroßer Wiki-Response darf den Sync-Job nicht blockieren/OOM auslösen.
  const response = await safeFetch(`${baseUrl()}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`SC Wiki request failed: ${path} -> ${response.status}`);
  }
  return readJsonCapped<T>(response);
}

export type ScWikiGameVersion = {
  code: string;
  channel: string | null;
  released_at: string | null;
  is_default: boolean;
};

export type ScWikiIngredient = {
  name: string | null;
  kind: "resource" | "item" | null;
  resource_type_uuid: string | null;
  item_uuid: string | null;
  /** Menge in SCU — nur bei kind="resource" (float, z. B. 0.36). */
  quantity_scu: number | null;
  /** Stückzahl — nur bei kind="item". */
  quantity: number | null;
};

export type ScWikiBlueprintOutput = {
  uuid: string | null;
  name: string | null;
  class: string | null;
  type: string | null;
  type_label: string | null;
};

export type ScWikiBlueprint = {
  uuid: string;
  key: string;
  output_item_uuid: string | null;
  output_name: string | null;
  output_class: string | null;
  craft_time_seconds: number | null;
  craft_time_label: string | null;
  is_available_by_default: boolean;
  game_version: string | null;
  ingredient_count: number;
  ingredients: ScWikiIngredient[] | null;
  output: ScWikiBlueprintOutput | null;
};

/** Mineable-Commodity aus der Listen-Ansicht (GET /api/commodities). */
export type ScWikiCommodity = {
  uuid: string;
  key: string;
  name: string;
  slug: string;
  /** Rarity — null bei allen Ground-Gems und Nicht-Erzen. */
  tier: string | null;
  density_g_per_cc: number | null;
  instability: number | null;
  resistance: number | null;
  is_mineable: boolean;
  has_ship_mineables: boolean;
  has_ground_vehicle_mineables: boolean;
  has_fps_mineables: boolean;
  /**
   * Radar-Signatur aus den Spieldaten — entspricht NICHT dem In-Game-
   * Scanner-RS-Wert (community-verifiziert, siehe signature-profiles.json)
   * und wird deshalb bewusst nicht gesynct.
   */
  signature: number | null;
  kind: string | null;
  /** Unzuverlässig (bei manchen Gems leer) — die has_*-Booleans sind maßgeblich. */
  methods: string[];
};

/**
 * Material-Eintrag eines Rock-Typs. Materialien erscheinen mehrfach —
 * ein Eintrag pro Quality-Band mit unterschiedlichen Prozentbereichen
 * (verifiziert 2026-07-22, z. B. Borase 24.3–74.3 % und 9.7–15.7 %).
 */
export type ScWikiResourceMaterial = {
  /** Entspricht exakt dem wikiKey in data/curated/ore-codes.json (z. B. "Ore_Borase"). */
  key: string;
  name: string;
  /** true, wenn das Material das abgefragte Commodity selbst ist. */
  is_current: boolean;
  min_percentage: number | null;
  max_percentage: number | null;
};

/**
 * Rock-/Deposit-Typ an einer Location (z. B. "MineableRock_AsteroidRare_Borase").
 * Keine Inert-/Füllmaterialien in materials (live geprüft 2026-07-22) —
 * das Material mit dem höchsten max_percentage ist das dominante Mineral.
 */
export type ScWikiLocationResource = {
  key: string;
  label: string | null;
  /** "SpaceShip_Mineables" | "GroundVehicle_Mineables" | "FPS_Mineables". */
  group_name: string | null;
  materials: ScWikiResourceMaterial[] | null;
};

/** Fundort-Eintrag im Commodity-Detail (GET /api/commodities/{slug}). */
export type ScWikiCommodityLocation = {
  /** Starmap-UUID der Location — Join-Schlüssel zu celestialBodies.wikiUuid. */
  uuid: string;
  name: string;
  system: string;
  type: string;
  parent_uuid: string | null;
  /** Chance, dass ein Rock/Deposit an der Location dieses Erz enthält. */
  group_probability_percent: number | null;
  /** Anteil dieses Erzes unter allen Erzen der Location. */
  relative_probability_percent: number | null;
  /** Rock-Typen mit Zusammensetzung — Quelle für Haupt-/Nebenvorkommen. */
  resources?: ScWikiLocationResource[] | null;
};

export type ScWikiCommodityDetail = ScWikiCommodity & {
  locations: ScWikiCommodityLocation[] | null;
};

/** Starmap-Location aus GET /api/locations. */
export type ScWikiLocation = {
  uuid: string;
  slug: string;
  name: string;
  has_resources: boolean;
  system: string;
  parent: {
    uuid: string;
    name: string;
    type_name: string;
    slug: string;
  } | null;
  type: { name: string; classification: string } | null;
  version: string | null;
};

type Paginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
};

/**
 * Zieht alle Seiten eines paginierten Endpunkts (Seitengröße 200).
 * Sequenziell, um die API nicht zu hämmern; MAX_PAGES als Backstop.
 */
async function fetchAllPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await fetchJson<Paginated<T>>(
      `${path}?page%5Bsize%5D=${PAGE_SIZE}&page%5Bnumber%5D=${page}`,
    );
    items.push(...(body.data ?? []));

    const lastPage = body.meta?.last_page ?? page;
    if (page >= lastPage) break;
  }

  return items;
}

export const scWikiClient = {
  defaultGameVersion: async (): Promise<ScWikiGameVersion> =>
    (await fetchJson<{ data: ScWikiGameVersion }>("/api/game-versions/default"))
      .data,
  blueprints: (): Promise<ScWikiBlueprint[]> =>
    fetchAllPages<ScWikiBlueprint>("/api/blueprints"),
  commodities: (): Promise<ScWikiCommodity[]> =>
    fetchAllPages<ScWikiCommodity>("/api/commodities"),
  commodityDetail: async (slug: string): Promise<ScWikiCommodityDetail> =>
    (
      await fetchJson<{ data: ScWikiCommodityDetail }>(
        `/api/commodities/${encodeURIComponent(slug)}`,
      )
    ).data,
  locations: (): Promise<ScWikiLocation[]> =>
    fetchAllPages<ScWikiLocation>("/api/locations"),
};
