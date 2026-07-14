import { describe, expect, it } from "vitest";
import { parseWorkOrder } from "./ocr-parse";

/**
 * Synthetische Fixtures nach dem bekannten Aufbau des Refinery-Terminals
 * (Materialzeile: Name + Menge, Fußzeilen: Processing Time / Methode).
 * Echte OCR-Dumps aus dem Spiel (Debug-Panel, Slice D4) ergänzen diese
 * Fälle, sobald der Nutzer sie an echten Terminals gesammelt hat.
 */
const EN_TERMINAL = [
  "WORK ORDER",
  "Quantainium 32 SCU",
  "Laranite 1,250 cSCU",
  "PROCESSING TIME 2H 5M",
  "Dinyx Solventation",
  "TOTAL COST 45,678 aUEC",
];

describe("parseWorkOrder", () => {
  it("extracts material rows with SCU quantities", () => {
    const parsed = parseWorkOrder(EN_TERMINAL);
    expect(parsed.items).toEqual([
      { oreName: "Quantainium", quantityScu: 32 },
      { oreName: "Laranite", quantityScu: 12.5 }, // 1.250 cSCU → 12,5 SCU
    ]);
  });

  it("extracts the processing duration in minutes", () => {
    expect(parseWorkOrder(EN_TERMINAL).durationMinutes).toBe(125);
  });

  it("parses HH:MM:SS durations", () => {
    const parsed = parseWorkOrder(["Quantainium 10 SCU", "02:05:00"]);
    expect(parsed.durationMinutes).toBe(125);
  });

  it("parses German decimal quantities", () => {
    const parsed = parseWorkOrder(["Hadanit 1.234,5 SCU"]);
    expect(parsed.items).toEqual([{ oreName: "Hadanit", quantityScu: 1234.5 }]);
  });

  it("keeps lines without quantities as unmatched candidates", () => {
    const parsed = parseWorkOrder(EN_TERMINAL);
    expect(parsed.unmatched).toContain("Dinyx Solventation");
    expect(parsed.unmatched).not.toContain("PROCESSING TIME 2H 5M");
  });

  it("ignores cost lines even though they contain numbers", () => {
    const parsed = parseWorkOrder(EN_TERMINAL);
    expect(
      parsed.items.find((item) => item.oreName.includes("COST")),
    ).toBeUndefined();
  });

  it("returns an empty result for empty input", () => {
    expect(parseWorkOrder([])).toEqual({
      items: [],
      durationMinutes: null,
      unmatched: [],
    });
  });
});
