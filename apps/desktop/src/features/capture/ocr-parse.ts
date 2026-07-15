import type { OcrLine, OcrWord } from "../../lib/tauri";
import { levenshtein } from "./fuzzy-match";
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
const HOURS_MINUTES_PATTERN = /(\d+)\s*H\s*(\d+)\s*M(?:\s*(\d+)\s*S)?/i;
const MINUTES_SECONDS_PATTERN = /(\d+)\s*M\s*(\d+)\s*S\b/i;
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

/**
 * Spalten-Toleranz (px) des koordinatenbasierten Tabellen-Parsers: am
 * realen Terminal liegen die Spaltenzentren (QUALITY/QTY/YIELD) nur rund
 * 60 px auseinander (Fixtures vom 15.07.2026) — 40 px trennt sauber.
 */
const TABLE_COLUMN_TOLERANCE = 40;
/** Horizontale Toleranz (px) der Namensspalte gegenüber "MATERIALS". */
const NAME_COLUMN_TOLERANCE = 60;
/**
 * Häufige Ziffern-Verleser der Windows-OCR (v. a. mit deutschem
 * Sprachmodell auf englischen Terminaltexten): 575→S7S, 0→o usw.
 */
const DIGIT_FIXES: Record<string, string> = {
  S: "5",
  s: "5",
  O: "0",
  o: "0",
  I: "1",
  l: "1",
  B: "8",
  Z: "2",
};

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
  // Sekunden immer aufrunden: der Job ist erst nach Ablauf wirklich fertig.
  const hoursMinutes = HOURS_MINUTES_PATTERN.exec(text);
  if (hoursMinutes) {
    return (
      Number(hoursMinutes[1]) * 60 +
      Number(hoursMinutes[2]) +
      (Number(hoursMinutes[3] ?? 0) > 0 ? 1 : 0)
    );
  }
  // Terminal-Anzeige unter einer Stunde: "50m 27s"
  const minutesSeconds = MINUTES_SECONDS_PATTERN.exec(text);
  if (minutesSeconds) {
    return Number(minutesSeconds[1]) + (Number(minutesSeconds[2]) > 0 ? 1 : 0);
  }
  const clock = CLOCK_PATTERN.exec(text);
  if (clock) {
    return (
      Number(clock[1]) * 60 + Number(clock[2]) + (Number(clock[3]) > 0 ? 1 : 0)
    );
  }
  return null;
}

/** Ganzzahl eines Zahlen-Worts inkl. Korrektur typischer OCR-Verleser. */
function numericWordValue(text: string): number | null {
  const mapped = [...text.trim()]
    .map((char) => DIGIT_FIXES[char] ?? char)
    .join("");
  return /^\d{1,5}$/.test(mapped) ? Number(mapped) : null;
}

function headerLike(word: string, label: string, maxDistance: number): boolean {
  return levenshtein(word.trim().toUpperCase(), label) <= maxDistance;
}

type MaterialTable = {
  headerY: number;
  nameX: number;
  qualityX: number;
  yieldX: number;
};

/**
 * Findet die Kopfzeile der Materialtabelle über das "QUALITY"-Wort (fuzzy —
 * die de-DE-Engine liest z. B. "OUALITY") und verankert Namensspalte
 * ("MATERIALS …") und Mengenspalte ("YIELD") auf derselben Kopfzeile.
 * Die Sidebar hat eigene MATERIAL/YIELD-Header, aber nie ein QUALITY.
 */
function findMaterialTable(lines: OcrLine[]): MaterialTable | null {
  let quality: OcrWord | null = null;
  for (const line of lines) {
    for (const word of line.words) {
      if (headerLike(word.text, "QUALITY", 2)) {
        quality = word;
        break;
      }
    }
  }
  if (quality === null) {
    return null;
  }
  const rowTolerance = quality.height * 1.2;
  let materials: OcrWord | null = null;
  let yieldHeader: OcrWord | null = null;
  for (const line of lines) {
    for (const word of line.words) {
      if (Math.abs(word.y - quality.y) > rowTolerance) {
        continue;
      }
      if (headerLike(word.text, "MATERIALS", 2)) {
        materials = word;
      } else if (headerLike(word.text, "YIELD", 1)) {
        yieldHeader = word;
      }
    }
  }
  if (materials === null || yieldHeader === null) {
    return null;
  }
  return {
    headerY: quality.y,
    nameX: materials.x,
    qualityX: wordCenterX(quality),
    yieldX: wordCenterX(yieldHeader),
  };
}

/**
 * Rekonstruiert die Materialzeilen des Terminals aus Wort-Koordinaten:
 * Das Terminal rendert Name und Zahlenspalten so weit auseinander, dass
 * die OCR sie als getrennte Zeilen liefert — Zeilen im Fließtext-Format
 * "NAME 32 SCU" existieren dort nicht. Zuordnung: Namenszeilen unter dem
 * Tabellenkopf in der MATERIALS-Spalte; Zahlen im selben y-Band, Spalte
 * per nächstgelegenem Header-Zentrum. Mengen sind cSCU (Terminal zeigt
 * die Werte ohne Einheit; der Kopf "MATERIALS YIELDED (CSCU)" bzw. die
 * Sidebar-Summen belegen die Skala).
 */
function tableItems(lines: OcrLine[], table: MaterialTable): ParsedItem[] {
  const items: ParsedItem[] = [];
  for (const line of lines) {
    const first = line.words[0];
    if (
      first === undefined ||
      first.y <= table.headerY + first.height / 2 ||
      Math.abs(first.x - table.nameX) > NAME_COLUMN_TOLERANCE ||
      !/[A-Za-z]{3,}/.test(line.text)
    ) {
      continue;
    }
    const name = line.text.replace(/^[^A-Za-z]+/, "").trim();
    if (/INERT/i.test(name)) {
      continue;
    }

    const rowCenterY = first.y + first.height / 2;
    const rowTolerance = first.height * 1.4;
    let quality: { value: number; distance: number } | null = null;
    let quantity: { value: number; distance: number } | null = null;
    for (const numberLine of lines) {
      for (const word of numberLine.words) {
        if (Math.abs(word.y + word.height / 2 - rowCenterY) > rowTolerance) {
          continue;
        }
        const value = numericWordValue(word.text);
        if (value === null) {
          continue;
        }
        const centerX = wordCenterX(word);
        const qualityDistance = Math.abs(centerX - table.qualityX);
        const yieldDistance = Math.abs(centerX - table.yieldX);
        if (
          qualityDistance <= TABLE_COLUMN_TOLERANCE &&
          qualityDistance < yieldDistance &&
          value <= 1000 &&
          (quality === null || qualityDistance < quality.distance)
        ) {
          quality = { value, distance: qualityDistance };
        } else if (
          yieldDistance <= TABLE_COLUMN_TOLERANCE &&
          yieldDistance < qualityDistance &&
          (quantity === null || yieldDistance < quantity.distance)
        ) {
          quantity = { value, distance: yieldDistance };
        }
      }
    }
    if (quantity === null) {
      continue;
    }
    items.push({
      oreName: name,
      quantityScu: quantity.value / 100,
      qualityRating: quality === null ? null : quality.value,
    });
  }
  return items;
}

/**
 * Extrahiert Materialzeilen (Erzname + Menge in SCU) und die Prozessdauer
 * aus rohen OCR-Zeilen des Refinery-Terminals. Erznamen bleiben roh —
 * das Fuzzy-Matching gegen den Katalog passiert im Formular.
 */
export function parseWorkOrder(input: InputLine[]): ParsedWorkOrder {
  const lines = input.map(normalizeLine);
  const qualityColumnX = findQualityColumnX(lines);

  // Koordinatenbasierte Tabellen-Rekonstruktion (reales Terminal-Layout);
  // der zeilenbasierte "NAME 32 SCU"-Pfad unten bleibt als Fallback für
  // Layouts ohne erkennbaren Tabellenkopf.
  const table = findMaterialTable(lines);
  const items: ParsedItem[] = table === null ? [] : tableItems(lines, table);
  const tableNames = new Set(items.map((item) => item.oreName));

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

    // Bereits als Tabellenzeile übernommen — nicht erneut anfassen.
    if (tableNames.has(text.replace(/^[^A-Za-z]+/, "").trim())) {
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
