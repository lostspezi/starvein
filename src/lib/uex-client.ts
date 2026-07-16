/**
 * Dünner Client für die UEX Corp API 2.0 (verifiziert 2026-07-09).
 * Öffentliche Endpunkte brauchen keinen Key; UEX_API_KEY wird — falls
 * gesetzt — als Bearer-Token mitgeschickt.
 */
function baseUrl(): string {
  return process.env.UEX_API_BASE_URL ?? "https://api.uexcorp.space/2.0";
}

async function fetchUex<T>(path: string): Promise<T[]> {
  const headers: Record<string, string> = {};
  if (process.env.UEX_API_KEY) {
    headers.Authorization = `Bearer ${process.env.UEX_API_KEY}`;
  }

  const response = await fetch(`${baseUrl()}/${path}`, { headers });
  if (!response.ok) {
    throw new Error(`UEX request failed: ${path} -> ${response.status}`);
  }

  const body = (await response.json()) as { data: T[] };
  return body.data ?? [];
}

export type UexPriceRecord = {
  id_commodity: number;
  id_terminal: number;
  terminal_name: string;
  price_buy: number;
  price_sell: number;
};

export type UexYieldRecord = {
  id_commodity: number;
  id_terminal: number;
  terminal_name: string;
  star_system_name: string | null;
  value: number;
};

export type UexMethodRecord = {
  id: number;
  code: string;
  name: string;
  rating_yield: number;
  rating_cost: number;
  rating_speed: number;
};

export type UexCommodityRecord = {
  id: number;
  code: string;
  name: string;
  is_raw: number;
};

export type UexItemRecord = {
  id: number;
  id_category: number;
  name: string;
  slug: string;
};

/**
 * Denormalisierte Geo-Felder, die UEX an Preis-Records mitliefert —
 * struktureller Typ, damit buildLocationLabel für Item- UND
 * Vehicle-Preise funktioniert.
 */
export type UexGeoFields = {
  star_system_name: string | null;
  planet_name: string | null;
  orbit_name: string | null;
  moon_name: string | null;
  space_station_name: string | null;
  outpost_name: string | null;
  city_name: string | null;
};

export type UexItemPriceRecord = UexGeoFields & {
  id_item: number;
  id_terminal: number;
  terminal_name: string;
  price_buy: number;
  terminal_is_player_owned: number;
};

export type UexVehicleRecord = {
  id: number;
  name: string;
  name_full: string;
  slug: string;
  is_mining: number;
};

/**
 * Kauf-/Miet-Record der per-Vehicle-Endpunkte (vehicles_purchases_prices /
 * vehicles_rentals_prices) — nur diese tragen die Geo-Felder und das
 * player-owned-Flag inline, die *_all-Varianten nicht (verifiziert 2026-07-16).
 */
export type UexVehiclePriceRecord = UexGeoFields & {
  id_vehicle: number;
  id_terminal: number;
  terminal_name: string;
  price_buy?: number;
  price_rent?: number;
  terminal_is_player_owned: number;
};

export const uexClient = {
  commodities: () => fetchUex<UexCommodityRecord>("commodities"),
  commodityPricesAll: () => fetchUex<UexPriceRecord>("commodities_prices_all"),
  refineryYields: () => fetchUex<UexYieldRecord>("refineries_yields"),
  refineryMethods: () => fetchUex<UexMethodRecord>("refineries_methods"),
  items: (categoryId: number) =>
    fetchUex<UexItemRecord>(`items?id_category=${categoryId}`),
  itemPrices: (categoryId: number) =>
    fetchUex<UexItemPriceRecord>(`items_prices?id_category=${categoryId}`),
  vehicles: () => fetchUex<UexVehicleRecord>("vehicles"),
  vehiclePurchasePrices: (vehicleId: number) =>
    fetchUex<UexVehiclePriceRecord>(
      `vehicles_purchases_prices?id_vehicle=${vehicleId}`,
    ),
  vehicleRentalPrices: (vehicleId: number) =>
    fetchUex<UexVehiclePriceRecord>(
      `vehicles_rentals_prices?id_vehicle=${vehicleId}`,
    ),
};
