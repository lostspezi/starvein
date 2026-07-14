import { parseLocalizedNumber } from "./parse-number";

export type ParsedItem = {
  oreName: string;
  quantityScu: number;
};

export type ParsedWorkOrder = {
  items: ParsedItem[];
  durationMinutes: number | null;
  /** Zeilen ohne Menge/Dauer — Kandidaten fürs Methoden-Matching im Formular. */
  unmatched: string[];
};

const QUANTITY_PATTERN = /^(.*?)\s*(\d[\d.,\s]*)\s*(µSCU|cSCU|SCU)\b/i;
const HOURS_MINUTES_PATTERN = /(\d+)\s*H\s*(\d+)\s*M/i;
const CLOCK_PATTERN = /(\d+):(\d{2}):(\d{2})/;
/** Kostenzeilen enthalten Zahlen, sind aber keine Materialien. */
const COST_PATTERN = /aUEC|COST|PREIS|KOSTEN/i;

const UNIT_FACTOR: Record<string, number> = {
  scu: 1,
  cscu: 1 / 100,
  µscu: 1 / 1_000_000,
};

function parseDuration(text: string): number | null {
  const hoursMinutes = HOURS_MINUTES_PATTERN.exec(text);
  if (hoursMinutes) {
    return Number(hoursMinutes[1]) * 60 + Number(hoursMinutes[2]);
  }
  const clock = CLOCK_PATTERN.exec(text);
  if (clock) {
    // Sekunden aufrunden: der Job ist erst nach Ablauf wirklich fertig.
    return (
      Number(clock[1]) * 60 + Number(clock[2]) + (Number(clock[3]) > 0 ? 1 : 0)
    );
  }
  return null;
}

/**
 * Extrahiert Materialzeilen (Erzname + Menge in SCU) und die Prozessdauer
 * aus rohen OCR-Zeilen des Refinery-Terminals. Erznamen bleiben roh —
 * das Fuzzy-Matching gegen den Katalog passiert im Formular.
 */
export function parseWorkOrder(lines: string[]): ParsedWorkOrder {
  const items: ParsedItem[] = [];
  const unmatched: string[] = [];
  let durationMinutes: number | null = null;

  for (const line of lines) {
    const text = line.trim();
    if (text.length === 0) {
      continue;
    }

    const duration = parseDuration(text);
    if (duration !== null) {
      durationMinutes ??= duration;
      continue;
    }

    if (!COST_PATTERN.test(text)) {
      const quantityMatch = QUANTITY_PATTERN.exec(text);
      if (quantityMatch) {
        const [, name, rawNumber, unit] = quantityMatch;
        const value = parseLocalizedNumber(rawNumber.trim());
        const oreName = name.trim();
        if (value !== null && oreName.length > 0) {
          items.push({
            oreName,
            quantityScu: value * UNIT_FACTOR[unit.toLowerCase()],
          });
          continue;
        }
      }
    }

    unmatched.push(text);
  }

  return { items, durationMinutes, unmatched };
}
