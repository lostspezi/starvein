/**
 * MSW-Mock der UEX-API für Sync-Tests (deterministisch, offline).
 * Basis-URL: https://uex.test/2.0 — Tests setzen UEX_API_BASE_URL darauf.
 */
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

export const UEX_TEST_BASE_URL = "https://uex.test/2.0";

export const uexFixtures = {
  commodities: [
    { id: 10, code: "GOLD", name: "Gold", is_raw: 0 },
    { id: 11, code: "GOLD", name: "Gold (Ore)", is_raw: 1 },
    { id: 12, code: "IRONO", name: "Iron (Ore)", is_raw: 1 },
    { id: 13, code: "WIDO", name: "WiDoW", is_raw: 0 },
  ],
  prices: [
    {
      id_commodity: 10,
      id_terminal: 12,
      terminal_name: "TDD Area 18",
      price_buy: 0,
      price_sell: 28000,
    },
    {
      id_commodity: 11,
      id_terminal: 99,
      terminal_name: "Refinery Deck Everus Harbor",
      price_buy: 0,
      price_sell: 14000,
    },
    {
      id_commodity: 13,
      id_terminal: 12,
      terminal_name: "TDD Area 18",
      price_buy: 0,
      price_sell: 9999,
    },
  ],
  yields: [
    {
      id_commodity: 12,
      id_terminal: 755,
      terminal_name: "Refinement Center - Nyx Gateway (Pyro)",
      star_system_name: "Pyro",
      value: -5,
    },
  ],
  methods: [
    {
      id: 1,
      name: "Cormack",
      code: "COR",
      rating_yield: 1,
      rating_cost: 2,
      rating_speed: 3,
    },
  ],
  // Equipment-Kataloge/-Preise, per id_category abgefragt (28/29/30)
  itemsByCategory: {
    "29": [
      {
        id: 800,
        id_category: 29,
        name: "Helix II Mining Laser",
        slug: "helix-ii-mining-laser",
      },
      {
        id: 801,
        id_category: 29,
        name: "Unmapped Laser",
        slug: "unmapped-mining-laser",
      },
    ],
    "30": [
      {
        id: 850,
        id_category: 30,
        name: "Rieger-C3 Module",
        slug: "rieger-c3-module",
      },
      { id: 851, id_category: 30, name: "ROC Module", slug: "roc-module" },
    ],
    "28": [{ id: 900, id_category: 28, name: "OptiMax", slug: "optimax" }],
  } as Record<string, unknown[]>,
  itemPricesByCategory: {
    "29": [
      {
        id_item: 800,
        id_terminal: 21,
        terminal_name: "Dumper's Depot - Area18",
        price_buy: 43500,
        star_system_name: "Stanton",
        planet_name: "ArcCorp",
        orbit_name: null,
        moon_name: null,
        space_station_name: null,
        outpost_name: null,
        city_name: "Area18",
        terminal_is_player_owned: 0,
      },
      {
        id_item: 800,
        id_terminal: 22,
        terminal_name: "Shubin Mining Facility SMO-10",
        price_buy: 41000,
        star_system_name: "Stanton",
        planet_name: "ArcCorp",
        orbit_name: null,
        moon_name: "Lyria",
        space_station_name: null,
        outpost_name: "Shubin SMO-10",
        city_name: null,
        terminal_is_player_owned: 0,
      },
      {
        id_item: 800,
        id_terminal: 23,
        terminal_name: "Player Depot",
        price_buy: 39000,
        star_system_name: "Stanton",
        planet_name: null,
        orbit_name: null,
        moon_name: null,
        space_station_name: null,
        outpost_name: null,
        city_name: null,
        terminal_is_player_owned: 1,
      },
      {
        id_item: 801,
        id_terminal: 21,
        terminal_name: "Dumper's Depot - Area18",
        price_buy: 10000,
        star_system_name: "Stanton",
        planet_name: null,
        orbit_name: null,
        moon_name: null,
        space_station_name: null,
        outpost_name: null,
        city_name: null,
        terminal_is_player_owned: 0,
      },
    ],
    "30": [
      {
        id_item: 850,
        id_terminal: 21,
        terminal_name: "Dumper's Depot - Area18",
        price_buy: 12500,
        star_system_name: "Stanton",
        planet_name: "ArcCorp",
        orbit_name: null,
        moon_name: null,
        space_station_name: null,
        outpost_name: null,
        city_name: "Area18",
        terminal_is_player_owned: 0,
      },
      {
        id_item: 850,
        id_terminal: 31,
        terminal_name: "Empty Shelf Shop",
        price_buy: 0,
        star_system_name: "Stanton",
        planet_name: null,
        orbit_name: null,
        moon_name: null,
        space_station_name: null,
        outpost_name: null,
        city_name: null,
        terminal_is_player_owned: 0,
      },
      {
        id_item: 851,
        id_terminal: 30,
        terminal_name: "Greycat Stand Orison",
        price_buy: 9000,
        star_system_name: "Stanton",
        planet_name: "Crusader",
        orbit_name: null,
        moon_name: null,
        space_station_name: null,
        outpost_name: null,
        city_name: "Orison",
        terminal_is_player_owned: 0,
      },
    ],
    "28": [
      {
        id_item: 900,
        id_terminal: 40,
        terminal_name: "Cubby Blast",
        price_buy: 4500,
        star_system_name: "Stanton",
        planet_name: "Hurston",
        orbit_name: null,
        moon_name: null,
        space_station_name: "Everus Harbor",
        outpost_name: null,
        city_name: null,
        terminal_is_player_owned: 0,
      },
    ],
  } as Record<string, unknown[]>,
};

export const uexServer = setupServer(
  http.get(`${UEX_TEST_BASE_URL}/commodities`, () =>
    HttpResponse.json({ status: "ok", data: uexFixtures.commodities }),
  ),
  http.get(`${UEX_TEST_BASE_URL}/commodities_prices_all`, () =>
    HttpResponse.json({ status: "ok", data: uexFixtures.prices }),
  ),
  http.get(`${UEX_TEST_BASE_URL}/refineries_yields`, () =>
    HttpResponse.json({ status: "ok", data: uexFixtures.yields }),
  ),
  http.get(`${UEX_TEST_BASE_URL}/refineries_methods`, () =>
    HttpResponse.json({ status: "ok", data: uexFixtures.methods }),
  ),
  // MSW matcht Pfade ohne Query — id_category wird hier ausgewertet
  http.get(`${UEX_TEST_BASE_URL}/items`, ({ request }) => {
    const category = new URL(request.url).searchParams.get("id_category") ?? "";
    return HttpResponse.json({
      status: "ok",
      data: uexFixtures.itemsByCategory[category] ?? [],
    });
  }),
  http.get(`${UEX_TEST_BASE_URL}/items_prices`, ({ request }) => {
    const category = new URL(request.url).searchParams.get("id_category") ?? "";
    return HttpResponse.json({
      status: "ok",
      data: uexFixtures.itemPricesByCategory[category] ?? [],
    });
  }),
);
