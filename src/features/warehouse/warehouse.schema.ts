import { z } from "zod";

const oreCode = z.string().regex(/^[A-Z]{2,5}$/);
const quantityScu = z.number().positive().max(100_000);
const systemCode = z.string().regex(/^[A-Z]+$/);
const bodySlug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/**
 * Lagerort als Union: celestialBody (verlinkbar mit dem Location-Browser),
 * terminal (Refinery-Terminal aus dem UEX-Sync — Ziel des Collect-Transfers)
 * oder custom (Freitext wie "im Schiff"). bodyName/terminalName sind
 * denormalisiert, damit die Liste ohne Joins rendert.
 */
export const warehouseLocationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("celestialBody"),
    systemCode,
    bodySlug,
    bodyName: z.string().min(1),
  }),
  z.object({
    kind: z.literal("terminal"),
    terminalId: z.number().int(),
    terminalName: z.string().min(1),
  }),
  z.object({ kind: z.literal("custom"), label: z.string().min(1).max(80) }),
]);

/**
 * Input-Variante ohne denormalisierte Namen — der Service löst bodyName/
 * terminalName selbst auf, damit Clients keine Labels fälschen können.
 */
export const warehouseLocationInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("celestialBody"), systemCode, bodySlug }).strict(),
  z
    .object({ kind: z.literal("terminal"), terminalId: z.number().int() })
    .strict(),
  z
    .object({ kind: z.literal("custom"), label: z.string().min(1).max(80) })
    .strict(),
]);

export const warehouseEntrySchema = z.object({
  id: z.string().min(1),
  ownerUserId: z.string().min(1),
  oreCode,
  kind: z.enum(["raw", "refined"]),
  quantityScu,
  location: warehouseLocationSchema,
  note: z.string().max(200).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

/** User-editierbare Felder — API-Input und Formular. */
export const warehouseEntryInputSchema = warehouseEntrySchema
  .pick({ oreCode: true, kind: true, quantityScu: true, note: true })
  .extend({ location: warehouseLocationInputSchema })
  .strict();

export type WarehouseLocation = z.infer<typeof warehouseLocationSchema>;
export type WarehouseLocationInput = z.infer<
  typeof warehouseLocationInputSchema
>;
export type WarehouseEntry = z.infer<typeof warehouseEntrySchema>;
export type WarehouseEntryInput = z.infer<typeof warehouseEntryInputSchema>;

export function warehouseLocationKey(location: WarehouseLocation): string {
  switch (location.kind) {
    case "celestialBody":
      return `body:${location.systemCode}:${location.bodySlug}`;
    case "terminal":
      return `terminal:${location.terminalId}`;
    case "custom":
      return `custom:${location.label}`;
  }
}

export function warehouseLocationLabel(location: WarehouseLocation): string {
  switch (location.kind) {
    case "celestialBody":
      return location.bodyName;
    case "terminal":
      return location.terminalName;
    case "custom":
      return location.label;
  }
}

export type WarehouseGroup = {
  key: string;
  label: string;
  totalScu: number;
  entries: WarehouseEntry[];
};

/** Gruppiert Einträge nach Lagerort; Reihenfolge = erstes Vorkommen. */
export function groupWarehouseEntries(
  entries: WarehouseEntry[],
): WarehouseGroup[] {
  const groups = new Map<string, WarehouseGroup>();
  for (const entry of entries) {
    const key = warehouseLocationKey(entry.location);
    const group = groups.get(key) ?? {
      key,
      label: warehouseLocationLabel(entry.location),
      totalScu: 0,
      entries: [],
    };
    group.totalScu += entry.quantityScu;
    group.entries.push(entry);
    groups.set(key, group);
  }
  return [...groups.values()];
}
