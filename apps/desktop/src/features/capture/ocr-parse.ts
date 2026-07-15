import type { OcrLine, OcrWord } from "../../lib/tauri";
import { parseLocalizedNumber } from "./parse-number";

export type ParsedItem = {
  oreName: string;
  quantityScu: number;
  /**
   * Qualität (0–1000), sofern eine "QUALITY"-Spalte am Terminal erkannt und
   * der Zeile zugeordnet werden konnte — sonst null (Nutzer trägt sie manuell
   * nach). Nur mit Wort-Koordinaten möglich; reiner Text ergibt null.
   */
  qualityRating: number | null;
};

/** Roh-Zeilen: entweder nur Text oder mit Wort-Koordinaten (ocr.rs). */
type InputLine = string | OcrLine;

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
/** Kopf der Qualitätsspalte — exaktes Terminal-Label am Live-Client prüfen. */
const QUALITY_HEADER_PATTERN = /^(QUALITY|QUALITÄT|GRADE|PURITY)$/i;
/** Reine Ganzzahl 0–1000 (Qualitätswert), z. B. "850". */
const INTEGER_WORD_PATTERN = /^\d{1,4}$/;
/**
 * Toleranz (px), innerhalb derer ein Wort noch zur Qualitätsspalte zählt.
 * Bewusst konservativ; bei anderer Terminal-Auflösung hier nachjustieren.
 */
const QUALITY_COLUMN_TOLERANCE = 60;

const UNIT_FACTOR: Record<string, number> = {
  scu: 1,
  cscu: 1 / 100,
  µscu: 1 / 1_000_000,
};

function normalizeLine(line: InputLine): OcrLine {
  return typeof line === "string" ? { text: line, words: [] } : line;
}

function wordCenterX(word: OcrWord): number {
  return word.x + word.width / 2;
}

/** Mitte-X der "QUALITY"-Kopfzeile über alle Zeilen; null, wenn keine da. */
function findQualityColumnX(lines: OcrLine[]): number | null {
  for (const line of lines) {
    for (const word of line.words) {
      if (QUALITY_HEADER_PATTERN.test(word.text.trim())) {
        return wordCenterX(word);
      }
    }
  }
  return null;
}

/**
 * Sucht in einer Materialzeile die Ganzzahl (0–1000), deren Wort-Mitte am
 * nächsten an der Qualitätsspalte liegt und innerhalb der Toleranz bleibt.
 * So wird die Mengen-Zahl (andere Spalte) nicht als Qualität missdeutet.
 */
function extractQuality(line: OcrLine, columnX: number | null): number | null {
  if (columnX === null || line.words.length === 0) {
    return null;
  }
  let best: { value: number; distance: number } | null = null;
  for (const word of line.words) {
    const text = word.text.trim();
    if (!INTEGER_WORD_PATTERN.test(text)) {
      continue;
    }
    const value = Number(text);
    if (value < 0 || value > 1000) {
      continue;
    }
    const distance = Math.abs(wordCenterX(word) - columnX);
    if (distance > QUALITY_COLUMN_TOLERANCE) {
      continue;
    }
    if (best === null || distance < best.distance) {
      best = { value, distance };
    }
  }
  return best === null ? null : best.value;
}

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
export function parseWorkOrder(input: InputLine[]): ParsedWorkOrder {
  const lines = input.map(normalizeLine);
  const qualityColumnX = findQualityColumnX(lines);

  const items: ParsedItem[] = [];
  const unmatched: string[] = [];
  let durationMinutes: number | null = null;

  for (const line of lines) {
    const text = line.text.trim();
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
            qualityRating: extractQuality(line, qualityColumnX),
          });
          continue;
        }
      }
    }

    unmatched.push(text);
  }

  return { items, durationMinutes, unmatched };
}
