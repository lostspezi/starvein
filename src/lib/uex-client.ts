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

export const uexClient = {
  commodities: () => fetchUex<UexCommodityRecord>("commodities"),
  commodityPricesAll: () => fetchUex<UexPriceRecord>("commodities_prices_all"),
  refineryYields: () => fetchUex<UexYieldRecord>("refineries_yields"),
  refineryMethods: () => fetchUex<UexMethodRecord>("refineries_methods"),
};
