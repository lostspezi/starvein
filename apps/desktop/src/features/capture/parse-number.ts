/**
 * Locale-tolerante Zahl aus OCR-Text: versteht "1.234,56" (de), "1,234.56"
 * (en) und OCR-Leerzeichen. Heuristik bei nur EINEM Trennzeichen: exakt drei
 * Nachfolgeziffern → Tausendertrenner (SCU-Mengen sind meist ganzzahlig),
 * sonst Dezimaltrenner.
 */
export function parseLocalizedNumber(raw: string): number | null {
  const cleaned = raw.replace(/\s+/g, "");
  if (!/^\d[\d.,]*$/.test(cleaned)) {
    return null;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized: string;
  if (lastComma !== -1 && lastDot !== -1) {
    // Beide vorhanden: das spätere Zeichen ist der Dezimaltrenner.
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = cleaned
      .split(thousandsSeparator)
      .join("")
      .replace(decimalSeparator, ".");
  } else if (lastComma !== -1 || lastDot !== -1) {
    const separatorIndex = Math.max(lastComma, lastDot);
    const separator = cleaned[separatorIndex];
    const digitsAfter = cleaned.length - separatorIndex - 1;
    const separatorCount = cleaned.split(separator).length - 1;
    const isThousands = digitsAfter === 3 || separatorCount > 1;
    normalized = isThousands
      ? cleaned.split(separator).join("")
      : cleaned.replace(separator, ".");
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
