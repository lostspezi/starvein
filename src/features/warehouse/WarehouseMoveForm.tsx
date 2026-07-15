"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";
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

/**
 * Inline-Formular zum Verschieben eines Lager-Eintrags an einen anderen
 * Lagerort. Die Menge ist auf den vollen Bestand vorbelegt: volle Menge =
 * kompletter Umzug, weniger = der Stack wird serverseitig geteilt.
 */
export function WarehouseMoveForm({
  entryId,
  quantityScu,
  systems,
  bodies,
  terminals,
  onDone,
}: {
  entryId: string;
  quantityScu: number;
  systems: SystemOption[];
  bodies: BodyOption[];
  terminals: TerminalOption[];
  onDone: () => void;
}) {
  const t = useTranslations("warehouse.entry");
  const router = useRouter();
  const formId = useId();

  const [location, setLocation] = useState(emptyLocationDraft());
  const [quantity, setQuantity] = useState(String(quantityScu));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const parsedQuantity = Number(quantity);
  const canSubmit =
    !busy &&
    isLocationDraftValid(location) &&
    Number.isFinite(parsedQuantity) &&
    parsedQuantity > 0 &&
    parsedQuantity <= quantityScu;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/warehouse/${entryId}/move`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location: buildLocationInput(location),
          quantityScu: parsedQuantity,
        }),
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      onDone();
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3">
      <p className="text-sm font-medium">{t("moveHeading")}</p>

      <LocationPicker
        idPrefix={formId}
        systems={systems}
        bodies={bodies}
        terminals={terminals}
        value={location}
        onChange={setLocation}
      />

      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${formId}-quantity`}
          className="text-xs text-text-muted"
        >
          {t("moveQuantityLabel")}
        </label>
        <input
          id={`${formId}-quantity`}
          type="number"
          min={0}
          max={quantityScu}
          step="any"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className={`${inputClass} w-40`}
        />
        <p className="text-xs text-text-muted">{t("moveQuantityHint")}</p>
      </div>

      {failed && <p className="text-sm text-warning">{t("moveError")}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {t("moveSubmit")}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onDone}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
