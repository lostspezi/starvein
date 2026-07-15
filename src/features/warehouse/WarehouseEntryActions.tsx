"use client";

import { ArrowRightLeft, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";
import {
  type BodyOption,
  type SystemOption,
  type TerminalOption,
} from "./LocationPicker";
import { WarehouseMoveForm } from "./WarehouseMoveForm";

const inputClass =
  "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none";

/**
 * Inline-Aktionen auf einem Lager-Eintrag: Menge/Notiz bearbeiten (PATCH),
 * an einen anderen Lagerort verschieben (ganz oder teilweise) und löschen
 * (mit Bestätigung). Nach Mutationen wird die Server-Komponente per
 * router.refresh() aktualisiert.
 */
export function WarehouseEntryActions({
  entryId,
  quantityScu,
  qualityRating,
  note,
  systems,
  bodies,
  terminals,
}: {
  entryId: string;
  quantityScu: number;
  qualityRating?: number;
  note: string;
  systems: SystemOption[];
  bodies: BodyOption[];
  terminals: TerminalOption[];
}) {
  const t = useTranslations("warehouse.entry");
  const router = useRouter();
  const formId = useId();
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [quantity, setQuantity] = useState(String(quantityScu));
  const [qualityDraft, setQualityDraft] = useState(
    qualityRating != null ? String(qualityRating) : "",
  );
  const [noteDraft, setNoteDraft] = useState(note);
  const [busy, setBusy] = useState(false);

  const parsedQuantity = Number(quantity);
  const canSave =
    !busy && Number.isFinite(parsedQuantity) && parsedQuantity > 0;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/warehouse/${entryId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quantityScu: parsedQuantity,
          ...(qualityDraft.trim() !== ""
            ? { qualityRating: Number(qualityDraft) }
            : {}),
          note: noteDraft.trim(),
        }),
      });
      if (response.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/warehouse/${entryId}`, {
        method: "DELETE",
      });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (moving) {
    return (
      <WarehouseMoveForm
        entryId={entryId}
        quantityScu={quantityScu}
        systems={systems}
        bodies={bodies}
        terminals={terminals}
        onDone={() => setMoving(false)}
      />
    );
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-end gap-2">
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
            className={`${inputClass} w-28`}
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
            value={qualityDraft}
            onChange={(event) => setQualityDraft(event.target.value)}
            className={`${inputClass} w-28`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${formId}-note`} className="text-xs text-text-muted">
            {t("noteLabel")}
          </label>
          <input
            id={`${formId}-note`}
            type="text"
            maxLength={200}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            className={`${inputClass} w-48`}
          />
        </div>
        <Button disabled={!canSave} onClick={save}>
          {t("save")}
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setEditing(false);
            setQuantity(String(quantityScu));
            setQualityDraft(qualityRating != null ? String(qualityRating) : "");
            setNoteDraft(note);
          }}
        >
          {t("cancel")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" disabled={busy} onClick={() => setEditing(true)}>
        <Pencil aria-hidden="true" className="size-4" />
        {t("edit")}
      </Button>
      <Button variant="ghost" disabled={busy} onClick={() => setMoving(true)}>
        <ArrowRightLeft aria-hidden="true" className="size-4" />
        {t("move")}
      </Button>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={remove}
        className="text-warning hover:text-warning"
        aria-label={t("delete")}
        title={t("delete")}
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
