import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import type { Ore } from "@starvein/shared/ores";
import type {
  RefineryMethod,
  RefineryTerminal,
} from "@starvein/shared/refinery-catalog";
import { ApiError, createRefineryJob } from "../../lib/api";
import type { OcrCapture } from "../../lib/tauri";
import { fuzzyBestMatch } from "./fuzzy-match";
import { parseWorkOrder } from "./ocr-parse";
import { matchTerminal } from "./terminal-match";

type ItemRow = {
  oreCode: string;
  quantity: string;
  quality: string;
  rawName: string | null;
};

type SubmitError = "missingTerminal" | "invalid" | "rateLimited" | "protocol";

function prefill(
  capture: OcrCapture,
  ores: Ore[],
  terminals: RefineryTerminal[],
  methods: RefineryMethod[],
): {
  rows: ItemRow[];
  terminalId: string;
  methodCode: string;
  duration: string;
  leftovers: string[];
} {
  // Ganze OcrLine[] (inkl. Wort-Koordinaten) weiterreichen, damit die
  // Qualitätsspalte per Layout erkannt werden kann.
  const parsed = parseWorkOrder(capture.lines);

  const oreCandidates = ores.map((ore) => ({
    key: ore.code,
    aliases: [ore.name_en, ore.name_de, ore.code],
  }));
  const rows: ItemRow[] = [];
  const leftovers: string[] = [];
  for (const item of parsed.items) {
    const match = fuzzyBestMatch(item.oreName, oreCandidates);
    if (match) {
      rows.push({
        oreCode: match.key,
        quantity: String(item.quantityScu),
        quality: item.qualityRating === null ? "" : String(item.qualityRating),
        rawName: item.oreName,
      });
    } else {
      leftovers.push(`${item.oreName} (${item.quantityScu} SCU)`);
    }
  }

  const methodCandidates = methods.map((method) => ({
    key: method.code,
    aliases: [method.name, method.code],
  }));
  let methodCode = "";
  let bestScore = Number.POSITIVE_INFINITY;
  for (const line of parsed.unmatched) {
    const match = fuzzyBestMatch(line, methodCandidates);
    if (match && match.score < bestScore) {
      methodCode = match.key;
      bestScore = match.score;
    }
  }

  // Terminal-Vorauswahl über den Stations-Teil des Katalognamens — Details
  // und warum kein Fuzzy-Match über den vollen Namen: terminal-match.ts.
  const terminalId = matchTerminal(parsed.unmatched, terminals);

  return {
    rows:
      rows.length > 0
        ? rows
        : [{ oreCode: "", quantity: "", quality: "", rawName: null }],
    terminalId,
    methodCode,
    duration:
      parsed.durationMinutes === null ? "" : String(parsed.durationMinutes),
    leftovers,
  };
}

/**
 * Editierbares Bestätigungsformular nach einer OCR-Erfassung: alle Werte
 * bleiben korrigierbar (OCR ist nie perfekt), Submit erzeugt den Job über
 * POST /api/refinery-jobs. Funktioniert auch mit leerem OCR-Ergebnis als
 * manuelle Eingabe.
 */
export function CaptureConfirmForm({
  token,
  capture,
  ores,
  terminals,
  methods,
  onCreated,
  onCancel,
}: {
  token: string;
  capture: OcrCapture;
  ores: Ore[];
  terminals: RefineryTerminal[];
  methods: RefineryMethod[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("capture.confirm");
  const initial = useMemo(
    () => prefill(capture, ores, terminals, methods),
    [capture, ores, terminals, methods],
  );

  const [rows, setRows] = useState<ItemRow[]>(initial.rows);
  const [terminalId, setTerminalId] = useState<string>(initial.terminalId);
  const [methodCode, setMethodCode] = useState<string>(initial.methodCode);
  const [duration, setDuration] = useState<string>(initial.duration);
  const [error, setError] = useState<SubmitError | null>(null);
  const [busy, setBusy] = useState(false);

  function updateRow(index: number, patch: Partial<ItemRow>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function submit() {
    if (terminalId === "") {
      setError("missingTerminal");
      return;
    }
    const items = rows
      .filter((row) => row.oreCode !== "" && row.quantity.trim() !== "")
      .map((row) => ({
        oreCode: row.oreCode,
        quantityScu: Number(row.quantity),
        ...(row.quality.trim() !== ""
          ? { qualityRating: Number(row.quality) }
          : {}),
      }));
    const durationMinutes = Number(duration);
    if (
      items.length === 0 ||
      items.some(
        (item) => !Number.isFinite(item.quantityScu) || item.quantityScu <= 0,
      ) ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0 ||
      methodCode === ""
    ) {
      setError("invalid");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createRefineryJob(token, {
        terminalId: Number(terminalId),
        methodCode,
        items,
        durationMinutes,
      });
      onCreated();
    } catch (submitError) {
      setBusy(false);
      if (submitError instanceof ApiError && submitError.status === 429) {
        setError("rateLimited");
      } else if (
        submitError instanceof ApiError &&
        submitError.status === 400
      ) {
        setError("invalid");
      } else {
        setError("protocol");
      }
    }
  }

  const inputClasses =
    "border-glass-border bg-bg-nebula text-text-primary rounded border px-2 py-1.5 text-sm";

  return (
    <section className="border-glass-border bg-glass w-full max-w-2xl rounded-lg border p-4 backdrop-blur-md">
      <h2 className="text-accent-ice mb-3 text-sm font-medium tracking-wide">
        {t("title")}
      </h2>

      <div className="flex flex-col gap-3">
        <label className="text-text-muted flex flex-col gap-1 text-xs">
          {t("terminalLabel")}
          <select
            aria-label={t("terminalLabel")}
            value={terminalId}
            onChange={(event) => setTerminalId(event.target.value)}
            className={inputClasses}
          >
            <option value="">{t("terminalPlaceholder")}</option>
            {terminals.map((terminal) => (
              <option key={terminal.terminalId} value={terminal.terminalId}>
                {terminal.terminalName}
                {terminal.starSystemName ? ` (${terminal.starSystemName})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="text-text-muted flex flex-col gap-1 text-xs">
          {t("methodLabel")}
          <select
            aria-label={t("methodLabel")}
            value={methodCode}
            onChange={(event) => setMethodCode(event.target.value)}
            className={inputClasses}
          >
            <option value="">{t("methodPlaceholder")}</option>
            {methods.map((method) => (
              <option key={method.code} value={method.code}>
                {method.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-text-muted mb-1 text-xs">
            {t("itemsLabel")}
          </legend>
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                aria-label={t("oreLabel")}
                value={row.oreCode}
                onChange={(event) =>
                  updateRow(index, { oreCode: event.target.value })
                }
                className={`${inputClasses} flex-1`}
              >
                <option value="">{t("orePlaceholder")}</option>
                {ores.map((ore) => (
                  <option key={ore.code} value={ore.code}>
                    {`${ore.code} — ${ore.name_en}`}
                  </option>
                ))}
              </select>
              <input
                aria-label={t("quantityLabel")}
                inputMode="decimal"
                value={row.quantity}
                onChange={(event) =>
                  updateRow(index, { quantity: event.target.value })
                }
                className={`${inputClasses} w-24`}
              />
              <span className="text-text-muted text-xs">SCU</span>
              <input
                aria-label={t("qualityLabel")}
                type="number"
                min={0}
                max={1000}
                step={1}
                value={row.quality}
                onChange={(event) =>
                  updateRow(index, { quality: event.target.value })
                }
                className={`${inputClasses} w-20`}
              />
              {/* Label wie die Terminal-Spalte, damit die Zuordnung
                  Screen → Formular auf einen Blick klar ist. */}
              <span className="text-text-muted text-xs">QUALITY</span>
              <button
                type="button"
                aria-label={t("removeItem")}
                onClick={() =>
                  setRows((current) => current.filter((_, i) => i !== index))
                }
                className="text-text-muted hover:text-warning px-1 text-sm transition-colors duration-150"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setRows((current) => [
                ...current,
                { oreCode: "", quantity: "", quality: "", rawName: null },
              ])
            }
            className="text-accent-primary hover:text-accent-glow w-fit text-xs transition-colors duration-150"
          >
            {t("addItem")}
          </button>
        </fieldset>

        <label className="text-text-muted flex w-40 flex-col gap-1 text-xs">
          {t("durationLabel")}
          <input
            aria-label={t("durationLabel")}
            type="number"
            min={1}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className={inputClasses}
          />
        </label>

        {initial.leftovers.length > 0 && (
          <p className="text-warning text-xs">
            {t("unmatched", { lines: initial.leftovers.join(", ") })}
          </p>
        )}

        {error && (
          <p className="text-warning text-sm" role="alert">
            {t(`errors.${error}`)}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="bg-accent-primary text-bg-void hover:bg-accent-glow hover:shadow-glow-primary rounded px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50"
          >
            {t("submit")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary rounded px-3 py-2 text-sm transition-colors duration-150"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </section>
  );
}
