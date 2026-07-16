/**
 * Dünner Client für die Star Citizen Wiki API v3 (verifiziert 2026-07-16).
 * Liefert als einzige bekannte Quelle echte Crafting-Blueprints inkl. Zutaten
 * (UEX hat dafür keine Daten, siehe data/curated-Historie).
 *
 * Öffentliche Endpunkte brauchen keinen Key. Basis-URL überschreibbar für Tests.
 * Doku: https://docs.star-citizen.wiki
 */
function baseUrl(): string {
  return process.env.SCWIKI_API_BASE_URL ?? "https://api.star-citizen.wiki";
}

/** Maximale Seitengröße laut API-Doku. */
const PAGE_SIZE = 200;
/** Backstop gegen Endlos-Pagination bei API-Fehlverhalten. */
const MAX_PAGES = 100;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`SC Wiki request failed: ${path} -> ${response.status}`);
  }
  return (await response.json()) as T;
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

type Paginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
};

/**
 * Zieht alle Blueprint-Seiten (Seitengröße 200, ~8 Requests für ~1560
 * Blueprints). Sequenziell, um die API nicht zu hämmern.
 */
async function allBlueprints(): Promise<ScWikiBlueprint[]> {
  const blueprints: ScWikiBlueprint[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await fetchJson<Paginated<ScWikiBlueprint>>(
      `/api/blueprints?page%5Bsize%5D=${PAGE_SIZE}&page%5Bnumber%5D=${page}`,
    );
    blueprints.push(...(body.data ?? []));

    const lastPage = body.meta?.last_page ?? page;
    if (page >= lastPage) break;
  }

  return blueprints;
}

export const scWikiClient = {
  defaultGameVersion: async (): Promise<ScWikiGameVersion> =>
    (await fetchJson<{ data: ScWikiGameVersion }>("/api/game-versions/default"))
      .data,
  blueprints: allBlueprints,
};
