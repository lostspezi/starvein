import type { WarehouseLocationInput } from "./warehouse.schema";

export type LocationKind = WarehouseLocationInput["kind"];

/**
 * Formular-Entwurf für die Lagerort-Auswahl (LocationPicker). Hält für alle
 * drei Varianten den Rohwert vor, damit ein Wechsel der `kind`-Radios die
 * bereits getroffene Auswahl nicht verwirft. `buildLocationInput` verdichtet
 * den Entwurf zum API-Input, `isLocationDraftValid` prüft die Vollständigkeit.
 */
export type LocationDraft = {
  kind: LocationKind;
  /** Combobox-Wert `"${systemCode}:${bodySlug}"`, "" = keine Auswahl. */
  bodyValue: string;
  /** Combobox-Wert der Terminal-ID als String, "" = keine Auswahl. */
  terminalId: string;
  customLabel: string;
};

export function emptyLocationDraft(
  kind: LocationKind = "celestialBody",
): LocationDraft {
  return { kind, bodyValue: "", terminalId: "", customLabel: "" };
}

export function buildLocationInput(
  draft: LocationDraft,
): WarehouseLocationInput {
  switch (draft.kind) {
    case "celestialBody": {
      const [systemCode, bodySlug] = draft.bodyValue.split(":");
      return { kind: "celestialBody", systemCode, bodySlug };
    }
    case "terminal":
      return { kind: "terminal", terminalId: Number(draft.terminalId) };
    case "custom":
      return { kind: "custom", label: draft.customLabel.trim() };
  }
}

export function isLocationDraftValid(draft: LocationDraft): boolean {
  switch (draft.kind) {
    case "celestialBody":
      return draft.bodyValue !== "";
    case "terminal":
      return draft.terminalId !== "";
    case "custom":
      return draft.customLabel.trim() !== "";
  }
}
