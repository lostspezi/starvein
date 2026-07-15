/**
 * Terminal-Vorauswahl aus den OCR-Zeilen des Refinery-Terminals.
 *
 * Die Katalognamen haben die Form "<Generischer Prefix> - <Station>"
 * (z. B. "Refinement Processing - ARC-L1", "Refinement Center - Levski").
 * Ein Fuzzy-Match über den vollen Namen greift daneben: der Modul-Header
 * "REFINEMENT CENTER" steht auf JEDEM Terminal und matchte so fälschlich
 * Levski (realer Fehlgriff am 15.07.2026). Deshalb wird ausschließlich
 * der Stations-Teil des Namens als Substring in den Zeilen gesucht —
 * der Screen-Header enthält ihn immer ("ARC-L1 WIDE FOREST STATION").
 */

export type TerminalCandidate = {
  terminalId: number;
  terminalName: string;
};

/**
 * Normalisierung für den Substring-Vergleich: Großschreibung, nur
 * Buchstaben/Ziffern, plus Korrektur der häufigen OCR-Verleser in
 * Kennungen wie "ARC-L1" → "ARC-LI" (I↔1, O↔0, S↔5). Beide Seiten
 * werden identisch normalisiert, damit der Vergleich konsistent bleibt.
 */
function normalizeLocation(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/I/g, "1")
    .replace(/O/g, "0")
    .replace(/S/g, "5");
}

const MIN_STATION_TOKEN_LENGTH = 4;

/**
 * Bestes Terminal zu den OCR-Zeilen; "" wenn keine Station erkennbar ist
 * (dann wählt der Nutzer manuell). Bei mehreren Treffern gewinnt der
 * längste (spezifischste) Stationsname.
 */
export function matchTerminal(
  lines: string[],
  terminals: TerminalCandidate[],
): string {
  const normalizedLines = lines.map(normalizeLocation);
  let best: { terminalId: string; specificity: number } | null = null;
  for (const terminal of terminals) {
    const parts = terminal.terminalName.split(" - ");
    const station = parts.length > 1 ? parts.slice(1).join(" - ") : "";
    const needle = normalizeLocation(station);
    if (needle.length < MIN_STATION_TOKEN_LENGTH) {
      continue;
    }
    const hit = normalizedLines.some((line) => line.includes(needle));
    if (hit && (best === null || needle.length > best.specificity)) {
      best = {
        terminalId: String(terminal.terminalId),
        specificity: needle.length,
      };
    }
  }
  return best === null ? "" : best.terminalId;
}
