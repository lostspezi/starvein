import { describe, expect, it } from "vitest";
import { parseWorkOrder } from "./ocr-parse";
import type { OcrLine } from "../../lib/tauri";

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
      { oreName: "Quantainium", quantityScu: 32, qualityRating: null },
      { oreName: "Laranite", quantityScu: 12.5, qualityRating: null }, // 1.250 cSCU → 12,5 SCU
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
    expect(parsed.items).toEqual([
      { oreName: "Hadanit", quantityScu: 1234.5, qualityRating: null },
    ]);
  });

  it("leaves qualityRating null for plain string input without coordinates", () => {
    const parsed = parseWorkOrder(["Quantainium 32 SCU 850"]);
    expect(parsed.items[0].qualityRating).toBeNull();
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

/**
 * Layout-Fixtures mit Wort-Koordinaten (x/y/width/height, wie ocr.rs sie
 * liefert). Spalten: MATERIAL (~x10), QUANTITY (~x200), QUALITY (~x400).
 * Der Qualitätswert wird über die Spalte der "QUALITY"-Kopfzeile der
 * richtigen Materialzeile zugeordnet — nicht über die Zeilenreihenfolge.
 */
function word(text: string, x: number): OcrLine["words"][number] {
  return { text, x, y: 0, width: text.length * 10, height: 18 };
}

const HEADER_LINE: OcrLine = {
  text: "MATERIAL QUANTITY QUALITY",
  words: [word("MATERIAL", 10), word("QUANTITY", 200), word("QUALITY", 400)],
};

describe("parseWorkOrder with word coordinates", () => {
  it("associates a quality value from the QUALITY column to its row", () => {
    const rows: OcrLine[] = [
      HEADER_LINE,
      {
        text: "Quantainium 32 SCU 850",
        words: [
          word("Quantainium", 10),
          word("32", 205),
          word("SCU", 240),
          word("850", 405),
        ],
      },
    ];

    const parsed = parseWorkOrder(rows);
    expect(parsed.items).toEqual([
      { oreName: "Quantainium", quantityScu: 32, qualityRating: 850 },
    ]);
  });

  it("does not mistake the quantity for the quality", () => {
    const rows: OcrLine[] = [
      HEADER_LINE,
      {
        // Keine Zahl in der Qualitätsspalte → qualityRating bleibt null,
        // die Mengen-Zahl (32) darf nicht fälschlich übernommen werden.
        text: "Quantainium 32 SCU",
        words: [word("Quantainium", 10), word("32", 205), word("SCU", 240)],
      },
    ];

    const parsed = parseWorkOrder(rows);
    expect(parsed.items[0].qualityRating).toBeNull();
  });

  it("falls back to null when no QUALITY header is present", () => {
    const rows: OcrLine[] = [
      {
        text: "Quantainium 32 SCU 850",
        words: [
          word("Quantainium", 10),
          word("32", 205),
          word("SCU", 240),
          word("850", 405),
        ],
      },
    ];

    const parsed = parseWorkOrder(rows);
    expect(parsed.items[0].qualityRating).toBeNull();
  });
});
