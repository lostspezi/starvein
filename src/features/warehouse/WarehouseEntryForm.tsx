"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";
import { Combobox } from "@/lib/components/ui/Combobox";
import { Panel } from "@/lib/components/ui/Panel";
import {
  buildLocationInput,
  emptyLocationDraft,
  isLocationDraftValid,
} from "./location-input";
import {
  LocationPicker,
  type BodyOption,
  type SystemOption,
  type TerminalOption,
} from "./LocationPicker";

const inputClass =
  "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none";

type OreOption = { code: string; name: string };

/**
 * Inline-Formular zum Anlegen eines Lager-Eintrags. Erz wird per
 * Autocomplete (Combobox) gewählt; die Lagerort-Auswahl übernimmt der
 * wiederverwendbare {@link LocationPicker}.
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

  const [oreCode, setOreCode] = useState("");
  const [kind, setKind] = useState<"raw" | "refined">("raw");
  const [quantity, setQuantity] = useState("1");
  const [quality, setQuality] = useState("");
  const [location, setLocation] = useState(emptyLocationDraft());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const oreOptions = ores.map((ore) => ({ value: ore.code, label: ore.name }));

  const quantityScu = Number(quantity);
  const canSubmit =
    !busy &&
    oreCode !== "" &&
    Number.isFinite(quantityScu) &&
    quantityScu > 0 &&
    isLocationDraftValid(location);

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
          ...(quality.trim() !== "" ? { qualityRating: Number(quality) } : {}),
          location: buildLocationInput(location),
          ...(note.trim() !== "" ? { note: note.trim() } : {}),
        }),
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      setQuantity("1");
      setQuality("");
      setNote("");
      setLocation(emptyLocationDraft(location.kind));
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

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
            <Combobox
              id={`${formId}-ore`}
              ariaLabel={t("oreLabel")}
              options={oreOptions}
              value={oreCode}
              onChange={setOreCode}
              placeholder={t("searchPlaceholder")}
              noResultsLabel={t("noMatches")}
            />
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

          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${formId}-quality`}
              className="text-xs text-text-muted"
            >
              {t("qualityLabel")}
            </label>
            <input
              id={`${formId}-quality`}
              type="number"
              min={0}
              max={1000}
              step={1}
              value={quality}
              onChange={(event) => setQuality(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <LocationPicker
          idPrefix={formId}
          systems={systems}
          bodies={bodies}
          terminals={terminals}
          value={location}
          onChange={setLocation}
        />

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
