/**
 * Tastenkombinationen für den Capture-Hotkey. Die Strings ("ctrl+alt+r")
 * müssen von `global_hotkey` in src-tauri/src/shortcuts.rs parsebar sein —
 * deshalb werden nur Buchstaben, Ziffern und F-Tasten zugelassen, jeweils
 * über `KeyboardEvent.code` (physische Taste, layoutunabhängig, identisch
 * zur `Code`-Semantik des Rust-Parsers).
 */

export const DEFAULT_HOTKEY = "ctrl+alt+r";

const MODIFIER_CODE = /^(Control|Alt|Shift|Meta)(Left|Right)$/;

type KeyComboSource = {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
};

function keyToken(code: string): string | null {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) {
    return letter[1].toLowerCase();
  }
  const digit = /^Digit([0-9])$/.exec(code);
  if (digit) {
    return digit[1];
  }
  const functionKey = /^F([1-9]|1[0-9]|2[0-4])$/.exec(code);
  if (functionKey) {
    return `f${functionKey[1]}`;
  }
  return null;
}

/**
 * Baut aus einem keydown-Event den Hotkey-String, oder `null` wenn die
 * Eingabe (noch) keine gültige Kombination ist. Buchstaben/Ziffern brauchen
 * mindestens einen Modifier, F-Tasten dürfen allein stehen.
 */
export function comboFromKeyboardEvent(event: KeyComboSource): string | null {
  if (MODIFIER_CODE.test(event.code)) {
    return null;
  }
  const key = keyToken(event.code);
  if (!key) {
    return null;
  }
  const modifiers = [
    event.ctrlKey ? "ctrl" : null,
    event.altKey ? "alt" : null,
    event.shiftKey ? "shift" : null,
    event.metaKey ? "super" : null,
  ].filter((modifier): modifier is string => modifier !== null);
  if (modifiers.length === 0 && !/^f\d+$/.test(key)) {
    return null;
  }
  return [...modifiers, key].join("+");
}

const DISPLAY_NAMES: Record<string, string> = {
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  super: "Win",
};

export function formatCombo(combo: string): string {
  return combo
    .split("+")
    .map((part) => DISPLAY_NAMES[part] ?? part.toUpperCase())
    .join("+");
}
