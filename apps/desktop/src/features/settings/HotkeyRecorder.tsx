import { useState } from "react";
import { useTranslations } from "use-intl";
import { comboFromKeyboardEvent, formatCombo } from "./hotkey";

/**
 * Hotkey-Zuweisung per Tastendruck statt Freitext: Klick aktiviert den
 * Aufnahme-Modus, die nächste gültige Kombination wird übernommen, Esc
 * oder Fokusverlust brechen ab. Kein Textfeld — Tippfehler wie "strg+…"
 * sind damit ausgeschlossen.
 */
export function HotkeyRecorder({
  value,
  label,
  onRecord,
}: {
  value: string;
  label: string;
  onRecord: (combo: string) => void;
}) {
  const t = useTranslations("settings");
  const [recording, setRecording] = useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      onKeyDown={(event) => {
        if (!recording) {
          return;
        }
        event.preventDefault();
        if (event.key === "Escape") {
          setRecording(false);
          return;
        }
        const combo = comboFromKeyboardEvent(event);
        if (combo) {
          setRecording(false);
          onRecord(combo);
        }
      }}
      className={`border-glass-border bg-bg-nebula w-64 rounded border px-2 py-1.5 text-left font-mono text-sm transition-all duration-200 ${
        recording
          ? "text-accent-cyan shadow-glow-sm"
          : "text-text-primary hover:shadow-glow-sm"
      }`}
    >
      {recording ? t("hotkeyPrompt") : formatCombo(value)}
    </button>
  );
}
