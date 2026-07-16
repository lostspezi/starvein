/**
 * Seitenaufteilung für die Blueprint-Liste.
 *
 * Nötig, weil das Wiki ~1560 Blueprints liefert: ungeteilt wären das ~2,9 MB
 * HTML pro Seitenaufruf (gemessen) — zu viel zum Parsen und Hydrieren.
 */
export const BLUEPRINT_PAGE_SIZE = 50;

export type Paginated<T> = {
  items: T[];
  /** Normalisierte, 1-basierte Seite (immer innerhalb der Grenzen). */
  page: number;
  totalPages: number;
  total: number;
};

/** Schneidet eine Seite heraus; ungültige Seiten werden geklemmt. */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number = BLUEPRINT_PAGE_SIZE,
): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: current,
    totalPages,
    total,
  };
}

/** Liest den page-Parameter aus searchParams (1 als Fallback). */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}
