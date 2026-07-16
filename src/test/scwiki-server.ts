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

export const scWikiFixtures = {
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
  // Echte Pagination: eine Seite pro Blueprint, damit der Client-Loop greift.
  http.get(`${SCWIKI_TEST_BASE_URL}/api/blueprints`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const size = Number(params.get("page[size]") ?? "200");
    const number = Number(params.get("page[number]") ?? "1");

    const all = scWikiFixtures.blueprints;
    const perPage = Math.min(size, 2);
    const lastPage = Math.max(1, Math.ceil(all.length / perPage));
    const start = (number - 1) * perPage;

    return HttpResponse.json({
      data: all.slice(start, start + perPage),
      meta: { current_page: number, last_page: lastPage, total: all.length },
    });
  }),
);
