"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Rechtsbündige Zusatzinfo, z. B. Sternsystem oder Seltenheit. */
  detail?: string;
};

/**
 * Autocomplete-Eingabe über eine feste Optionsliste (clientseitiges
 * Filtern, kein Fetch): Fokus öffnet alle Optionen, Tippen filtert
 * (case-insensitive contains), Auswahl per Klick oder Pfeiltasten+Enter.
 * Blur verwirft einen offenen Entwurf; ein geleertes Feld deselektiert.
 * ARIA-Muster wie SearchBox (combobox + listbox + aria-activedescendant).
 */
export function Combobox({
  id,
  ariaLabel,
  options,
  value,
  onChange,
  placeholder,
  noResultsLabel,
  inputClassName,
}: {
  id?: string;
  ariaLabel: string;
  options: ComboboxOption[];
  /** Wert der ausgewählten Option, "" = keine Auswahl. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  noResultsLabel: string;
  inputClassName?: string;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  // null = kein Entwurf, Anzeige folgt der Auswahl
  const [draft, setDraft] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = options.find((option) => option.value === value);
  const display = draft ?? selected?.label ?? "";

  const query = draft?.trim().toLowerCase() ?? "";
  const filtered =
    query === ""
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(query));

  function select(option: ComboboxOption) {
    onChange(option.value);
    setDraft(null);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onBlur() {
    // Verzögert wie in SearchBox, damit ein Klick auf eine Option greift
    blurTimer.current = setTimeout(() => {
      if (draft === "") onChange("");
      setDraft(null);
      setOpen(false);
      setActiveIndex(-1);
    }, 150);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setDraft(null);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || filtered.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % filtered.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? filtered.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      select(filtered[activeIndex]);
    }
  }

  return (
    <div className="relative w-full">
      <input
        id={id}
        role="combobox"
        type="text"
        value={display}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        className={cn(
          "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none",
          inputClassName,
        )}
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute top-full z-10 mt-1 max-h-64 w-full overflow-y-auto rounded border border-bg-nebula-2 bg-bg-nebula shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted">
              {noResultsLabel}
            </li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option.value}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(option);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex cursor-pointer items-baseline justify-between gap-2 px-3 py-2 text-sm",
                  index === activeIndex && "bg-bg-nebula-2",
                )}
              >
                <span>{option.label}</span>
                {option.detail && (
                  <span className="text-xs text-text-muted">
                    {option.detail}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
