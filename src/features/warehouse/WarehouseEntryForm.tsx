"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";
import { Panel } from "@/lib/components/ui/Panel";

const inputClass =
  "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none";

const selectClass =
  "rounded border border-bg-nebula-2 bg-bg-void px-2 py-1 text-sm focus:border-accent-primary focus:outline-none";

type OreOption = { code: string; name: string };
type SystemOption = { code: string; name: string };
type BodyOption = { systemCode: string; slug: string; name: string };
type TerminalOption = { terminalId: number; terminalName: string };

type LocationKind = "celestialBody" | "terminal" | "custom";

/**
 * Inline-Formular zum Anlegen eines Lager-Eintrags. Die Lagerort-Auswahl
 * wechselt per Radio zwischen Himmelskörper, Refinery-Terminal (nur wenn
 * gesynct) und Freitext.
 */
export function WarehouseEntryForm({
  ores,
  systems,
  bodies,
  terminals,
}: {
  ores: OreOption[];
  systems: SystemOption[];
  bodies: BodyOption[];
  terminals: TerminalOption[];
}) {
  const t = useTranslations("warehouse.form");
  const router = useRouter();
  const formId = useId();

  const [oreCode, setOreCode] = useState(ores[0]?.code ?? "");
  const [kind, setKind] = useState<"raw" | "refined">("raw");
  const [quantity, setQuantity] = useState("1");
  const [locationKind, setLocationKind] =
    useState<LocationKind>("celestialBody");
  const [bodyValue, setBodyValue] = useState(
    bodies[0] ? `${bodies[0].systemCode}:${bodies[0].slug}` : "",
  );
  const [terminalId, setTerminalId] = useState(
    terminals[0] ? String(terminals[0].terminalId) : "",
  );
  const [customLabel, setCustomLabel] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const systemNames = new Map(systems.map((s) => [s.code, s.name]));

  function buildLocation() {
    switch (locationKind) {
      case "celestialBody": {
        const [systemCode, bodySlug] = bodyValue.split(":");
        return { kind: "celestialBody", systemCode, bodySlug } as const;
      }
      case "terminal":
        return { kind: "terminal", terminalId: Number(terminalId) } as const;
      case "custom":
        return { kind: "custom", label: customLabel.trim() } as const;
    }
  }

  const quantityScu = Number(quantity);
  const canSubmit =
    !busy &&
    oreCode !== "" &&
    Number.isFinite(quantityScu) &&
    quantityScu > 0 &&
    (locationKind !== "celestialBody" || bodyValue !== "") &&
    (locationKind !== "terminal" || terminalId !== "") &&
    (locationKind !== "custom" || customLabel.trim() !== "");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/warehouse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          oreCode,
          kind,
          quantityScu,
          location: buildLocation(),
          ...(note.trim() !== "" ? { note: note.trim() } : {}),
        }),
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      setQuantity("1");
      setNote("");
      setCustomLabel("");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const locationKinds: LocationKind[] = [
    "celestialBody",
    ...(terminals.length > 0 ? (["terminal"] as const) : []),
    "custom",
  ];
  const locationKindLabels: Record<LocationKind, string> = {
    celestialBody: t("locationBody"),
    terminal: t("locationTerminal"),
    custom: t("locationCustom"),
  };

  return (
    <Panel className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h2 className="text-base font-medium">{t("heading")}</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${formId}-ore`}
              className="text-xs text-text-muted"
            >
              {t("oreLabel")}
            </label>
            <select
              id={`${formId}-ore`}
              value={oreCode}
              onChange={(event) => setOreCode(event.target.value)}
              className={selectClass}
            >
              {ores.map((ore) => (
                <option key={ore.code} value={ore.code}>
                  {ore.name}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs text-text-muted">
              {t("kindLabel")}
            </legend>
            <div className="flex gap-3 py-1 text-sm">
              {(["raw", "refined"] as const).map((option) => (
                <label key={option} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name={`${formId}-kind`}
                    checked={kind === option}
                    onChange={() => setKind(option)}
                  />
                  {t(option === "raw" ? "kindRaw" : "kindRefined")}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${formId}-quantity`}
              className="text-xs text-text-muted"
            >
              {t("quantityLabel")}
            </label>
            <input
              id={`${formId}-quantity`}
              type="number"
              min={0}
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs text-text-muted">
            {t("locationKindLabel")}
          </legend>
          <div className="flex flex-wrap gap-3 py-1 text-sm">
            {locationKinds.map((option) => (
              <label key={option} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`${formId}-location-kind`}
                  checked={locationKind === option}
                  onChange={() => setLocationKind(option)}
                />
                {locationKindLabels[option]}
              </label>
            ))}
          </div>

          {locationKind === "celestialBody" && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`${formId}-body`}
                className="text-xs text-text-muted"
              >
                {t("bodyLabel")}
              </label>
              <select
                id={`${formId}-body`}
                value={bodyValue}
                onChange={(event) => setBodyValue(event.target.value)}
                className={selectClass}
              >
                {systems.map((system) => (
                  <optgroup
                    key={system.code}
                    label={systemNames.get(system.code) ?? system.code}
                  >
                    {bodies
                      .filter((body) => body.systemCode === system.code)
                      .map((body) => (
                        <option
                          key={`${body.systemCode}:${body.slug}`}
                          value={`${body.systemCode}:${body.slug}`}
                        >
                          {body.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {locationKind === "terminal" && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`${formId}-terminal`}
                className="text-xs text-text-muted"
              >
                {t("terminalLabel")}
              </label>
              <select
                id={`${formId}-terminal`}
                value={terminalId}
                onChange={(event) => setTerminalId(event.target.value)}
                className={selectClass}
              >
                {terminals.map((terminal) => (
                  <option key={terminal.terminalId} value={terminal.terminalId}>
                    {terminal.terminalName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {locationKind === "custom" && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`${formId}-custom`}
                className="text-xs text-text-muted"
              >
                {t("customLabel")}
              </label>
              <input
                id={`${formId}-custom`}
                type="text"
                maxLength={80}
                value={customLabel}
                placeholder={t("customPlaceholder")}
                onChange={(event) => setCustomLabel(event.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${formId}-note`} className="text-xs text-text-muted">
            {t("noteLabel")}
          </label>
          <input
            id={`${formId}-note`}
            type="text"
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={inputClass}
          />
        </div>

        {failed && <p className="text-sm text-warning">{t("error")}</p>}

        <div>
          <Button type="submit" disabled={!canSubmit}>
            {t("submit")}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
