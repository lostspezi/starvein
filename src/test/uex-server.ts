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
);
