import { describe, expect, it } from "vitest";
import { mergeWorkOrders } from "./merge-work-orders";
import type { ParsedItem, ParsedWorkOrder } from "./ocr-parse";

function item(over: Partial<ParsedItem>): ParsedItem {
  return {
    oreName: "TITANIUM",
    quantityScu: 0.63,
    qualityRating: 295,
    sourceY: 100,
    ...over,
  };
}

function frame(over: Partial<ParsedWorkOrder>): ParsedWorkOrder {
  return { items: [], durationMinutes: null, unmatched: [], ...over };
}

describe("mergeWorkOrders", () => {
  it("reduces a single frame to one merged item per row (N=1 regression)", () => {
    const frames = [
      frame({
        items: [
          item({ oreName: "TITANIUM", quantityScu: 0.63, qualityRating: 295 }),
          item({
            oreName: "AGRICIUM",
            quantityScu: 0.21,
            qualityRating: 588,
            sourceY: 200,
          }),
        ],
        durationMinutes: 51,
        unmatched: ["Dinyx Solventation"],
      }),
    ];

    const merged = mergeWorkOrders(frames);
    expect(merged.items).toEqual([
      {
        fragments: ["TITANIUM"],
        quantityScu: 0.63,
        qualityRating: 295,
        sourceY: 100,
      },
      {
        fragments: ["AGRICIUM"],
        quantityScu: 0.21,
        qualityRating: 588,
        sourceY: 200,
      },
    ]);
    expect(merged.durationMinutes).toBe(51);
    expect(merged.unmatched).toEqual(["Dinyx Solventation"]);
  });

  it("votes the most frequent quantity/quality across frames", () => {
    const frames = [
      frame({ items: [item({ quantityScu: 0.63, qualityRating: 295 })] }),
      frame({ items: [item({ quantityScu: 0.63, qualityRating: 295 })] }),
      // Ausreißer-Frame mit Verlesern:
      frame({ items: [item({ quantityScu: 0.07, qualityRating: 299 })] }),
    ];

    const merged = mergeWorkOrders(frames);
    expect(merged.items).toHaveLength(1);
    expect(merged.items[0].quantityScu).toBe(0.63);
    expect(merged.items[0].qualityRating).toBe(295);
  });

  it("fills a value that was missing in one frame from another frame", () => {
    const frames = [
      frame({ items: [item({ quantityScu: null, qualityRating: 295 })] }),
      frame({ items: [item({ quantityScu: 0.63, qualityRating: null })] }),
    ];

    const merged = mergeWorkOrders(frames);
    expect(merged.items[0].quantityScu).toBe(0.63);
    expect(merged.items[0].qualityRating).toBe(295);
  });

  it("keeps a value null only when no frame supplied it", () => {
    const frames = [
      frame({ items: [item({ quantityScu: null })] }),
      frame({ items: [item({ quantityScu: null })] }),
    ];

    expect(mergeWorkOrders(frames).items[0].quantityScu).toBeNull();
  });

  it("groups rows across frames by y-band, keeping same-name rows separate", () => {
    // Zwei Titanium-Zeilen auf verschiedenen y-Bändern; Frame B hat nur
    // die obere erkannt. Ergebnis: beide Zeilen bleiben erhalten.
    const frames = [
      frame({
        items: [
          item({ oreName: "TITANIUM", sourceY: 100, quantityScu: 0.63 }),
          item({ oreName: "TITANIUM", sourceY: 155, quantityScu: 0.76 }),
        ],
      }),
      frame({
        items: [item({ oreName: "TITANIUM", sourceY: 103, quantityScu: 0.63 })],
      }),
    ];

    const merged = mergeWorkOrders(frames);
    expect(merged.items.map((i) => i.quantityScu)).toEqual([0.63, 0.76]);
  });

  it("unions marquee name fragments of the same row across frames", () => {
    const frames = [
      frame({ items: [item({ oreName: "QUANTAINIU", sourceY: 100 })] }),
      frame({ items: [item({ oreName: "UANTAINIUM", sourceY: 102 })] }),
      frame({ items: [item({ oreName: "QUANTAINIU", sourceY: 101 })] }),
    ];

    const merged = mergeWorkOrders(frames);
    expect(merged.items).toHaveLength(1);
    expect(merged.items[0].fragments).toEqual(["QUANTAINIU", "UANTAINIUM"]);
  });

  it("votes the processing duration across frames", () => {
    const frames = [
      frame({ durationMinutes: 51 }),
      frame({ durationMinutes: 51 }),
      frame({ durationMinutes: 8 }),
    ];
    expect(mergeWorkOrders(frames).durationMinutes).toBe(51);
  });

  it("unions unmatched lines across frames without duplicates", () => {
    const frames = [
      frame({
        unmatched: ["ARC-LI WIDE FOREST STATION", "Dinyx Solventation"],
      }),
      frame({
        unmatched: ["ARC-L1 WIDE FOREST STATION", "Dinyx Solventation"],
      }),
    ];
    expect(mergeWorkOrders(frames).unmatched).toEqual([
      "ARC-LI WIDE FOREST STATION",
      "Dinyx Solventation",
      "ARC-L1 WIDE FOREST STATION",
    ]);
  });

  it("groups coordinate-less (string) rows by name", () => {
    const frames = [
      frame({
        items: [
          item({ oreName: "Quantainium", sourceY: null, quantityScu: 32 }),
        ],
      }),
      frame({
        items: [
          item({ oreName: "Quantainium", sourceY: null, quantityScu: 32 }),
        ],
      }),
    ];
    expect(mergeWorkOrders(frames).items).toHaveLength(1);
  });

  it("returns an empty result for no frames", () => {
    expect(mergeWorkOrders([])).toEqual({
      items: [],
      durationMinutes: null,
      unmatched: [],
    });
  });
});
