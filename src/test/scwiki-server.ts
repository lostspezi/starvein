/**
 * MSW-Mock der Star-Citizen-Wiki-API für Sync-Tests (deterministisch, offline).
 * Basis-URL: https://scwiki.test — Tests setzen SCWIKI_API_BASE_URL darauf.
 *
 * Die Blueprint-Route paginiert echt (page[size]/page[number]), damit der
 * Client-Pagination-Pfad im Test wirklich durchlaufen wird.
 */
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

export const SCWIKI_TEST_BASE_URL = "https://scwiki.test";

export const GAME_VERSION = "4.8.2-LIVE.12030094";

const AGRI_UUID = "dc6fbcbb-5990-4ed5-82ee-93152dab7845";
const HADA_UUID = "125dd723-95ad-488d-830f-62c954445ca1";
const ICE_UUID = "aaaaaaaa-0000-4000-8000-000000000001";

// Starmap-Location-UUIDs (Join-Schlüssel zwischen Locations- und Commodity-Fixtures)
export const LOC_UUIDS = {
  hurston: "10000000-0000-4000-8000-000000000001",
  aberdeen: "10000000-0000-4000-8000-000000000002",
  arccorp: "10000000-0000-4000-8000-000000000003",
  wala: "10000000-0000-4000-8000-000000000004",
  miningArea061: "10000000-0000-4000-8000-000000000005",
  lorville: "10000000-0000-4000-8000-000000000006",
  hurL1: "10000000-0000-4000-8000-000000000007",
  frontierMoon: "10000000-0000-4000-8000-000000000008",
  emptyRock: "10000000-0000-4000-8000-000000000009",
} as const;

const STAR_PARENT = {
  uuid: "20000000-0000-4000-8000-000000000001",
  name: "Stanton",
  type_name: "Star",
  slug: "stanton",
};

export const scWikiFixtures = {
  /**
   * Starmap-Locations: deckt Filter (Manmade raus, Asteroid nur mit
   * Ressourcen), L-Punkt-Heuristik, unbekanntes System und die
   * Outpost-ohne-Ressourcen-Konstellation (Mining Area 061) ab.
   */
  locations: [
    {
      uuid: LOC_UUIDS.hurston,
      slug: "hurston",
      name: "Hurston",
      has_resources: true,
      system: "Stanton System",
      parent: STAR_PARENT,
      type: { name: "Planet", classification: "Planet" },
      version: GAME_VERSION,
    },
    {
      uuid: LOC_UUIDS.aberdeen,
      slug: "aberdeen",
      name: "Aberdeen",
      has_resources: true,
      system: "Stanton System",
      parent: {
        uuid: LOC_UUIDS.hurston,
        name: "Hurston",
        type_name: "Planet",
        slug: "hurston",
      },
      type: { name: "Moon", classification: "Moon" },
      version: GAME_VERSION,
    },
    {
      uuid: LOC_UUIDS.arccorp,
      slug: "arccorp",
      name: "ArcCorp",
      has_resources: false,
      system: "Stanton System",
      parent: STAR_PARENT,
      type: { name: "Planet", classification: "Planet" },
      version: GAME_VERSION,
    },
    {
      uuid: LOC_UUIDS.wala,
      slug: "wala",
      name: "Wala",
      has_resources: true,
      system: "Stanton System",
      parent: {
        uuid: LOC_UUIDS.arccorp,
        name: "ArcCorp",
        type_name: "Planet",
        slug: "arccorp",
      },
      type: { name: "Moon", classification: "Moon" },
      version: GAME_VERSION,
    },
    // Mining-Outpost ohne eigene Ressourcen -> Erze kommen per Roll-up von Wala.
    {
      uuid: LOC_UUIDS.miningArea061,
      slug: "arccorp-mining-area-061",
      name: "ArcCorp Mining Area 061",
      has_resources: false,
      system: "Stanton System",
      parent: {
        uuid: LOC_UUIDS.wala,
        name: "Wala",
        type_name: "Moon",
        slug: "wala",
      },
      type: { name: "Outpost", classification: "Outpost" },
      version: GAME_VERSION,
    },
    // Stadt -> Klassifikation "Manmade" wird nicht gesynct.
    {
      uuid: LOC_UUIDS.lorville,
      slug: "lorville",
      name: "Lorville",
      has_resources: false,
      system: "Stanton System",
      parent: {
        uuid: LOC_UUIDS.hurston,
        name: "Hurston",
        type_name: "Planet",
        slug: "hurston",
      },
      type: { name: "LandingZone", classification: "Manmade" },
      version: GAME_VERSION,
    },
    // Lagrange-Asteroid-Cluster mit Ressourcen -> lagrangePoint (Namens-Heuristik).
    {
      uuid: LOC_UUIDS.hurL1,
      slug: "hur-l1",
      name: "HUR L1",
      has_resources: true,
      system: "Stanton System",
      parent: STAR_PARENT,
      type: { name: "Asteroid_ValidQT", classification: "Asteroid" },
      version: GAME_VERSION,
    },
    // Asteroid ohne Ressourcen -> wird nicht gesynct.
    {
      uuid: LOC_UUIDS.emptyRock,
      slug: "empty-rock",
      name: "Empty Rock",
      has_resources: false,
      system: "Stanton System",
      parent: STAR_PARENT,
      type: { name: "Asteroid", classification: "Asteroid" },
      version: GAME_VERSION,
    },
    // Unbekanntes System -> wird nicht gesynct.
    {
      uuid: LOC_UUIDS.frontierMoon,
      slug: "frontier-moon",
      name: "Frontier Moon",
      has_resources: true,
      system: "Frontier System",
      parent: null,
      type: { name: "Moon", classification: "Moon" },
      version: GAME_VERSION,
    },
  ],
  /**
   * Commodities: Ship-Erz mit Signatur (Agricium), Ship-Erz ohne Signatur
   * (Quantainium -> kuratierter Fallback), Gem ohne Tier (Hadanite),
   * Gem ohne Methoden-Info (Carinite -> mineableByFallback), unmapped
   * Mineable (-> geskippt) und ein Nicht-Mineable.
   */
  commodities: [
    {
      uuid: "30000000-0000-4000-8000-000000000001",
      key: "Ore_Agricium",
      name: "Agricium (Ore)",
      slug: "agricium-ore",
      tier: "uncommon",
      density_g_per_cc: 8.4,
      instability: 350,
      resistance: 0.5,
      is_mineable: true,
      has_ship_mineables: true,
      has_ground_vehicle_mineables: false,
      has_fps_mineables: false,
      signature: 4000,
      kind: "mineable",
      methods: ["Ship"],
    },
    {
      uuid: "30000000-0000-4000-8000-000000000002",
      key: "Raw_Quantainium",
      name: "Quantainium (Raw)",
      slug: "quantainium-raw",
      tier: "legendary",
      density_g_per_cc: 20.45,
      instability: 1000,
      resistance: 0.95,
      is_mineable: true,
      has_ship_mineables: true,
      has_ground_vehicle_mineables: false,
      has_fps_mineables: false,
      signature: null,
      kind: "mineable",
      methods: ["Ship"],
    },
    {
      uuid: HADA_UUID,
      key: "Hadanite",
      name: "Hadanite",
      slug: "hadanite",
      tier: null,
      density_g_per_cc: 1,
      instability: 200,
      resistance: 0,
      is_mineable: true,
      has_ship_mineables: false,
      has_ground_vehicle_mineables: false,
      has_fps_mineables: true,
      signature: 3000,
      kind: "mineable",
      methods: ["FPS"],
    },
    {
      uuid: "30000000-0000-4000-8000-000000000004",
      key: "Carinite",
      name: "Carinite",
      slug: "carinite",
      tier: null,
      density_g_per_cc: 1,
      instability: 300,
      resistance: 0.5,
      is_mineable: true,
      has_ship_mineables: false,
      has_ground_vehicle_mineables: false,
      has_fps_mineables: false,
      signature: 3000,
      kind: "mineable",
      methods: [],
    },
    {
      uuid: "30000000-0000-4000-8000-000000000005",
      key: "Raw_Newmineral",
      name: "Newmineral (Raw)",
      slug: "newmineral-raw",
      tier: "rare",
      density_g_per_cc: 5,
      instability: 100,
      resistance: 0.2,
      is_mineable: true,
      has_ship_mineables: true,
      has_ground_vehicle_mineables: false,
      has_fps_mineables: false,
      signature: 2222,
      kind: "mineable",
      methods: ["Ship"],
    },
    {
      uuid: AGRI_UUID,
      key: "Agricium",
      name: "Agricium",
      slug: "agricium",
      tier: null,
      density_g_per_cc: 1,
      instability: null,
      resistance: null,
      is_mineable: false,
      has_ship_mineables: false,
      has_ground_vehicle_mineables: false,
      has_fps_mineables: false,
      signature: null,
      kind: null,
      methods: [],
    },
  ],
  /** Commodity-Details (nur Mineables werden vom Sync abgefragt). */
  commodityLocations: {
    "agricium-ore": [
      {
        uuid: LOC_UUIDS.wala,
        name: "Wala",
        system: "Stanton System",
        type: "Moon",
        parent_uuid: LOC_UUIDS.arccorp,
        group_probability_percent: 20,
        relative_probability_percent: 10,
      },
      {
        uuid: LOC_UUIDS.hurL1,
        name: "HUR L1",
        system: "Stanton System",
        type: "Asteroid",
        parent_uuid: null,
        group_probability_percent: 12,
        relative_probability_percent: 4,
      },
    ],
    "quantainium-raw": [
      {
        uuid: LOC_UUIDS.aberdeen,
        name: "Aberdeen",
        system: "Stanton System",
        type: "Moon",
        parent_uuid: LOC_UUIDS.hurston,
        group_probability_percent: 6,
        relative_probability_percent: 2,
      },
      // Zeigt auf eine weggefilterte Location -> muss geskippt werden.
      {
        uuid: LOC_UUIDS.lorville,
        name: "Lorville",
        system: "Stanton System",
        type: "LandingZone",
        parent_uuid: LOC_UUIDS.hurston,
        group_probability_percent: 1,
        relative_probability_percent: 1,
      },
    ],
    hadanite: [
      {
        uuid: LOC_UUIDS.wala,
        name: "Wala",
        system: "Stanton System",
        type: "Moon",
        parent_uuid: LOC_UUIDS.arccorp,
        group_probability_percent: 25,
        relative_probability_percent: 6,
      },
    ],
    carinite: [
      {
        uuid: LOC_UUIDS.aberdeen,
        name: "Aberdeen",
        system: "Stanton System",
        type: "Moon",
        parent_uuid: LOC_UUIDS.hurston,
        group_probability_percent: 15,
        relative_probability_percent: 5,
      },
    ],
  } as Record<
    string,
    Array<{
      uuid: string;
      name: string;
      system: string;
      type: string;
      parent_uuid: string | null;
      group_probability_percent: number | null;
      relative_probability_percent: number | null;
    }>
  >,
  blueprints: [
    {
      uuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
      key: "BP_CRAFT_AMRS_LaserCannon_S1",
      output_item_uuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
      output_name: "Omnisky III Cannon",
      output_class: "amrs_lasercannon_s1",
      craft_time_seconds: 540,
      craft_time_label: "9 minutes",
      is_available_by_default: false,
      game_version: GAME_VERSION,
      ingredient_count: 2,
      ingredients: [
        {
          name: "Agricium",
          kind: "resource",
          resource_type_uuid: AGRI_UUID,
          item_uuid: null,
          quantity_scu: 0.36,
          quantity: null,
        },
        {
          name: "Hadanite",
          kind: "item",
          resource_type_uuid: null,
          item_uuid: HADA_UUID,
          quantity_scu: null,
          quantity: 7,
        },
      ],
      output: {
        uuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
        name: "Omnisky III Cannon",
        class: "amrs_lasercannon_s1",
        type: "WeaponGun",
        type_label: "Weapon Gun",
      },
    },
    {
      uuid: "1893e596-acaf-49bc-b367-e43e99c2925f",
      key: "BP_CRAFT_Char_Armor_Helmet_01",
      output_item_uuid: "1893e596-acaf-49bc-b367-e43e99c2925f",
      output_name: "Beacon Helmet",
      output_class: "char_armor_helmet_01",
      craft_time_seconds: 120,
      craft_time_label: "2 minutes",
      is_available_by_default: true,
      game_version: GAME_VERSION,
      ingredient_count: 1,
      ingredients: [
        {
          name: "Pressurized Ice",
          kind: "resource",
          resource_type_uuid: ICE_UUID,
          item_uuid: null,
          quantity_scu: 2,
          quantity: null,
        },
      ],
      output: {
        uuid: "1893e596-acaf-49bc-b367-e43e99c2925f",
        name: "Beacon Helmet",
        class: "char_armor_helmet_01",
        type: "Char_Armor_Helmet",
        type_label: "Helmet",
      },
    },
    // Ohne Zutaten -> muss vom Sync übersprungen werden.
    {
      uuid: "462c1e37-6259-4942-91e1-9c4de47ef0e4",
      key: "BP_CRAFT_EMPTY",
      output_item_uuid: null,
      output_name: "Nothing",
      output_class: null,
      craft_time_seconds: 0,
      craft_time_label: null,
      is_available_by_default: false,
      game_version: GAME_VERSION,
      ingredient_count: 0,
      ingredients: [],
      output: {
        uuid: null,
        name: null,
        class: null,
        type: "Misc",
        type_label: null,
      },
    },
  ],
};

/** Echte Pagination (max. 2 Items/Seite), damit der Client-Loop greift. */
function paginatedHandler(all: unknown[]) {
  return ({ request }: { request: Request }) => {
    const params = new URL(request.url).searchParams;
    const size = Number(params.get("page[size]") ?? "200");
    const number = Number(params.get("page[number]") ?? "1");

    const perPage = Math.min(size, 2);
    const lastPage = Math.max(1, Math.ceil(all.length / perPage));
    const start = (number - 1) * perPage;

    return HttpResponse.json({
      data: all.slice(start, start + perPage),
      meta: { current_page: number, last_page: lastPage, total: all.length },
    });
  };
}

export const scWikiServer = setupServer(
  http.get(`${SCWIKI_TEST_BASE_URL}/api/game-versions/default`, () =>
    HttpResponse.json({
      data: {
        code: GAME_VERSION,
        channel: "live",
        released_at: "2026-06-17T20:20:26+00:00",
        is_default: true,
      },
    }),
  ),
  http.get(`${SCWIKI_TEST_BASE_URL}/api/blueprints`, ({ request }) =>
    paginatedHandler(scWikiFixtures.blueprints)({ request }),
  ),
  http.get(`${SCWIKI_TEST_BASE_URL}/api/locations`, ({ request }) =>
    paginatedHandler(scWikiFixtures.locations)({ request }),
  ),
  http.get(`${SCWIKI_TEST_BASE_URL}/api/commodities`, ({ request }) =>
    paginatedHandler(scWikiFixtures.commodities)({ request }),
  ),
  http.get(
    `${SCWIKI_TEST_BASE_URL}/api/commodities/:slug`,
    ({ params }: { params: { slug: string } }) => {
      const commodity = scWikiFixtures.commodities.find(
        (c) => c.slug === params.slug,
      );
      if (!commodity) {
        return HttpResponse.json(
          { message: "No commodity found for the specified identifier." },
          { status: 404 },
        );
      }
      return HttpResponse.json({
        data: {
          ...commodity,
          locations: scWikiFixtures.commodityLocations[params.slug] ?? [],
        },
      });
    },
  ),
);
