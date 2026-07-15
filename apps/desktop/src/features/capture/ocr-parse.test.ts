import { describe, expect, it } from "vitest";
import { parseWorkOrder } from "./ocr-parse";
import type { OcrLine } from "../../lib/tauri";
import processingFixture from "./__fixtures__/refinery-processing-dede.json";
import setupFixture from "./__fixtures__/refinery-setup-dede.json";

const SETUP_LINES = setupFixture as OcrLine[];
const PROCESSING_LINES = processingFixture as OcrLine[];

/** Item ohne sourceY — für Assertions, die nur Name/Menge/Qualität prüfen. */
function core(items: ReturnType<typeof parseWorkOrder>["items"]) {
  return items.map(({ oreName, quantityScu, qualityRating }) => ({
    oreName,
    quantityScu,
    qualityRating,
  }));
}

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
    expect(core(parsed.items)).toEqual([
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
    expect(core(parsed.items)).toEqual([
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

/**
 * Echte OCR-Dumps (Windows-OCR, de-DE-Engine) von den Refinery-Terminals
 * ARC-L1, SC 4.x — Ground Truth siehe Screenshots vom 15.07.2026. Das
 * Terminal rendert Materialname und Zahlenspalten so weit auseinander,
 * dass die OCR sie als separate Zeilen liefert; die Zuordnung muss über
 * Wort-Koordinaten laufen. Enthält typische Verleser der deutschen
 * Engine: QUALITY→OUALITY, QTY→OTY, 575→S7S, 0→o.
 */
describe("parseWorkOrder on real terminal captures", () => {
  it("reconstructs the material table of the SETUP screen", () => {
    const parsed = parseWorkOrder(SETUP_LINES);

    expect(core(parsed.items)).toEqual([
      { oreName: "TITANIUM (ORE)", quantityScu: 0.63, qualityRating: 295 },
      { oreName: "TITANIUM (ORE)", quantityScu: 0.76, qualityRating: 516 },
      { oreName: "ASLARITE (RAW)", quantityScu: 0.13, qualityRating: 575 },
      { oreName: "AGRICIUM (ORE)", quantityScu: 0.21, qualityRating: 588 },
    ]);
  });

  it("parses the minutes-and-seconds processing time of the SETUP screen", () => {
    // "PROCESSING TIME 50m 27s" → aufgerundet 51 Minuten
    expect(parseWorkOrder(SETUP_LINES).durationMinutes).toBe(51);
  });

  it("keeps station and method lines available for downstream matching", () => {
    const parsed = parseWorkOrder(SETUP_LINES);
    expect(parsed.unmatched).toContain("ARC-LI WIDE FOREST STATION");
    expect(parsed.unmatched).toContain("Dinyx Solventation");
  });

  it("reconstructs the material table of the PROCESSING screen", () => {
    const parsed = parseWorkOrder(PROCESSING_LINES);

    expect(core(parsed.items)).toEqual([
      { oreName: "TITANIUM", quantityScu: 0.63, qualityRating: 295 },
      { oreName: "TITANIUM", quantityScu: 0.76, qualityRating: 516 },
      { oreName: "ASLARITE", quantityScu: 0.13, qualityRating: 575 },
      { oreName: "AGRICIUM", quantityScu: 0.21, qualityRating: 588 },
    ]);
    expect(parsed.durationMinutes).toBe(51);
  });

  it("never turns inert materials or sidebar rows into items", () => {
    for (const lines of [SETUP_LINES, PROCESSING_LINES]) {
      const names = parseWorkOrder(lines).items.map((item) => item.oreName);
      expect(names.join(" ")).not.toMatch(/INERT/i);
      expect(names.join(" ")).not.toMatch(/Iron|Corundum|Quartz|Laranite/i);
    }
  });
});

/**
 * Koordinaten-Tabelle mit echten Terminal-Headern (MATERIALS/YIELD/QUALITY),
 * damit der Pfad `findMaterialTable` → `tableItems` getroffen wird. Spalten
 * wie an ARC-L1: Name ~710, QUALITY-Zentrum ~885, YIELD-Zentrum ~1005.
 */
function tableWord(
  text: string,
  x: number,
  y: number,
): OcrLine["words"][number] {
  return { text, x, y, width: text.length * 9, height: 14 };
}

const TABLE_HEADER: OcrLine = {
  text: "MATERIALS QUALITY YIELD",
  words: [
    tableWord("MATERIALS", 673, 0),
    tableWord("QUALITY", 866, 0),
    tableWord("YIELD", 996, 0),
  ],
};

function materialRow(
  name: string,
  y: number,
  quality: number | null,
  quantity: number | null,
): OcrLine[] {
  const rows: OcrLine[] = [{ text: name, words: [tableWord(name, 710, y)] }];
  if (quality !== null) {
    rows.push({
      text: String(quality),
      words: [tableWord(String(quality), 878, y)],
    });
  }
  if (quantity !== null) {
    rows.push({
      text: String(quantity),
      words: [tableWord(String(quantity), 1004, y)],
    });
  }
  return rows;
}

describe("parseWorkOrder keeps partial rows", () => {
  it("keeps a row whose quantity column is missing, with quantityScu null", () => {
    const lines: OcrLine[] = [
      TABLE_HEADER,
      ...materialRow("TITANIUM", 40, 295, 63),
      // AGRICIUM: Name + Qualität erkannt, aber die YIELD-Zahl fehlt.
      ...materialRow("AGRICIUM", 93, 588, null),
    ];

    const parsed = parseWorkOrder(lines);
    expect(core(parsed.items)).toEqual([
      { oreName: "TITANIUM", quantityScu: 0.63, qualityRating: 295 },
      { oreName: "AGRICIUM", quantityScu: null, qualityRating: 588 },
    ]);
  });

  it("keeps a row where only the quality survived (quantity missing)", () => {
    const lines: OcrLine[] = [
      TABLE_HEADER,
      ...materialRow("QUANTAINIUM", 40, 720, null),
    ];

    const parsed = parseWorkOrder(lines);
    expect(core(parsed.items)).toEqual([
      { oreName: "QUANTAINIUM", quantityScu: null, qualityRating: 720 },
    ]);
  });

  it("drops a name-only row with no numbers (indistinguishable from a label)", () => {
    // Ohne jede Zahl ist eine Zeile nicht von einem Footer-Label wie
    // "TOTAL COST" zu unterscheiden — sie darf kein Erz werden.
    const lines: OcrLine[] = [
      TABLE_HEADER,
      ...materialRow("QUANTAINIUM", 40, null, null),
    ];

    expect(parseWorkOrder(lines).items).toEqual([]);
  });
});

/**
 * Deutscher Spielclient: die Terminal-Header sind übersetzt (MATERIALS →
 * MATERIALIEN, YIELD → ERTRAG/AUSBEUTE, …). Der Alias-Mechanismus in
 * ocr-parse.ts (MATERIALS_HEADERS/YIELD_HEADERS/…) ist vorbereitet; die
 * exakten deutschen Strings sind erst mit echten Screenshots eines
 * deutschen Terminals bekannt.
 *
 * Aktivierung (sobald refinery-*-dede-client.json vorliegt):
 *   1. deutsche Labels in die *_HEADERS-Tabellen eintragen,
 *   2. hier die echten Fixtures laden und this `it.skip` → `it` machen.
 * Bis dahin bewusst geskippt — keine geratenen deutschen Strings.
 */
describe("parseWorkOrder on a German client (pending real fixtures)", () => {
  it.skip("reconstructs the material table with German column headers", () => {
    // Platzhalter: mit den Ist-Werten aus dem deutschen SETUP-Screenshot
    // befüllen (Erze, Menge, Qualität), analog zu den EN-Fixtures.
    expect(true).toBe(true);
  });
});

describe("parseWorkOrder sourceY", () => {
  it("tags each table row with the y of its name line (cross-frame merge key)", () => {
    const lines: OcrLine[] = [
      TABLE_HEADER,
      ...materialRow("TITANIUM", 40, 295, 63),
      ...materialRow("AGRICIUM", 93, 588, 21),
    ];

    const parsed = parseWorkOrder(lines);
    // centerY = name.y + height/2 (14/2 = 7)
    expect(parsed.items.map((item) => item.sourceY)).toEqual([47, 100]);
  });

  it("leaves sourceY null for plain string input without coordinates", () => {
    const parsed = parseWorkOrder(["Quantainium 32 SCU"]);
    expect(parsed.items[0].sourceY).toBeNull();
  });
});

describe("parseWorkOrder duration formats", () => {
  it("parses minutes-and-seconds and hours-minutes-seconds", () => {
    expect(parseWorkOrder(["TIME REMAINING 50m 17s"]).durationMinutes).toBe(51);
    expect(parseWorkOrder(["PROCESSING TIME 1h 30m 20s"]).durationMinutes).toBe(
      91,
    );
    expect(parseWorkOrder(["PROCESSING TIME 45m 0s"]).durationMinutes).toBe(45);
  });
});

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
    expect(core(parsed.items)).toEqual([
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
