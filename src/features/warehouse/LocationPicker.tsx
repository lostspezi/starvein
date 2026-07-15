"use client";

import { useTranslations } from "next-intl";
import { Combobox } from "@/lib/components/ui/Combobox";
import {
  emptyLocationDraft,
  type LocationDraft,
  type LocationKind,
} from "./location-input";

const inputClass =
  "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none";

export type SystemOption = { code: string; name: string };
export type BodyOption = { systemCode: string; slug: string; name: string };
export type TerminalOption = { terminalId: number; terminalName: string };

/**
 * Wiederverwendbare Lagerort-Auswahl (Anlege- und Verschieben-Formular):
 * Radios wechseln zwischen Himmelskörper (Combobox), Refinery-Terminal
 * (Combobox, nur wenn gesynct) und Freitext. Kontrolliert über einen
 * {@link LocationDraft}; Ableitung zum API-Input via `buildLocationInput`.
 */
export function LocationPicker({
  idPrefix,
  systems,
  bodies,
  terminals,
  value,
  onChange,
}: {
  idPrefix: string;
  systems: SystemOption[];
  bodies: BodyOption[];
  terminals: TerminalOption[];
  value: LocationDraft;
  onChange: (draft: LocationDraft) => void;
}) {
  const t = useTranslations("warehouse.form");

  const systemNames = new Map(systems.map((s) => [s.code, s.name]));
  const bodyOptions = bodies.map((body) => ({
    value: `${body.systemCode}:${body.slug}`,
    label: body.name,
    detail: systemNames.get(body.systemCode) ?? body.systemCode,
  }));
  const terminalOptions = terminals.map((terminal) => ({
    value: String(terminal.terminalId),
    label: terminal.terminalName,
  }));

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
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs text-text-muted">
        {t("locationKindLabel")}
      </legend>
      <div className="flex flex-wrap gap-3 py-1 text-sm">
        {locationKinds.map((option) => (
          <label key={option} className="flex items-center gap-1.5">
            <input
              type="radio"
              name={`${idPrefix}-location-kind`}
              checked={value.kind === option}
              onChange={() => onChange({ ...emptyLocationDraft(option) })}
            />
            {locationKindLabels[option]}
          </label>
        ))}
      </div>

      {value.kind === "celestialBody" && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${idPrefix}-body`}
            className="text-xs text-text-muted"
          >
            {t("bodyLabel")}
          </label>
          <Combobox
            id={`${idPrefix}-body`}
            ariaLabel={t("bodyLabel")}
            options={bodyOptions}
            value={value.bodyValue}
            onChange={(bodyValue) => onChange({ ...value, bodyValue })}
            placeholder={t("searchPlaceholder")}
            noResultsLabel={t("noMatches")}
          />
        </div>
      )}

      {value.kind === "terminal" && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${idPrefix}-terminal`}
            className="text-xs text-text-muted"
          >
            {t("terminalLabel")}
          </label>
          <Combobox
            id={`${idPrefix}-terminal`}
            ariaLabel={t("terminalLabel")}
            options={terminalOptions}
            value={value.terminalId}
            onChange={(terminalId) => onChange({ ...value, terminalId })}
            placeholder={t("searchPlaceholder")}
            noResultsLabel={t("noMatches")}
          />
        </div>
      )}

      {value.kind === "custom" && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${idPrefix}-custom`}
            className="text-xs text-text-muted"
          >
            {t("customLabel")}
          </label>
          <input
            id={`${idPrefix}-custom`}
            type="text"
            maxLength={80}
            value={value.customLabel}
            placeholder={t("customPlaceholder")}
            onChange={(event) =>
              onChange({ ...value, customLabel: event.target.value })
            }
            className={inputClass}
          />
        </div>
      )}
    </fieldset>
  );
}
