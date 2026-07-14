import { describe, expect, it } from "vitest";
import { comboFromKeyboardEvent, formatCombo } from "./hotkey";

type KeyLike = {
  code: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
};

function keys(overrides: KeyLike) {
  return {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...overrides,
  };
}

describe("comboFromKeyboardEvent", () => {
  it("builds a combo from modifiers and a letter", () => {
    expect(
      comboFromKeyboardEvent(
        keys({ code: "KeyM", ctrlKey: true, altKey: true }),
      ),
    ).toBe("ctrl+alt+m");
  });

  it("orders modifiers deterministically regardless of press order", () => {
    expect(
      comboFromKeyboardEvent(
        keys({ code: "KeyA", altKey: true, ctrlKey: true, shiftKey: true }),
      ),
    ).toBe("ctrl+alt+shift+a");
  });

  it("supports digits", () => {
    expect(
      comboFromKeyboardEvent(
        keys({ code: "Digit3", ctrlKey: true, shiftKey: true }),
      ),
    ).toBe("ctrl+shift+3");
  });

  it("maps the meta key to super", () => {
    expect(comboFromKeyboardEvent(keys({ code: "KeyK", metaKey: true }))).toBe(
      "super+k",
    );
  });

  it("allows bare function keys without modifiers", () => {
    expect(comboFromKeyboardEvent(keys({ code: "F5" }))).toBe("f5");
    expect(comboFromKeyboardEvent(keys({ code: "F13", ctrlKey: true }))).toBe(
      "ctrl+f13",
    );
  });

  it("rejects letters and digits without any modifier", () => {
    expect(comboFromKeyboardEvent(keys({ code: "KeyM" }))).toBeNull();
    expect(comboFromKeyboardEvent(keys({ code: "Digit7" }))).toBeNull();
  });

  it("rejects pure modifier presses", () => {
    expect(
      comboFromKeyboardEvent(keys({ code: "ControlLeft", ctrlKey: true })),
    ).toBeNull();
    expect(
      comboFromKeyboardEvent(keys({ code: "AltRight", altKey: true })),
    ).toBeNull();
  });

  it("rejects unsupported keys", () => {
    expect(
      comboFromKeyboardEvent(keys({ code: "Escape", ctrlKey: true })),
    ).toBeNull();
    expect(
      comboFromKeyboardEvent(keys({ code: "Space", ctrlKey: true })),
    ).toBeNull();
  });
});

describe("formatCombo", () => {
  it("renders a stored combo for display", () => {
    expect(formatCombo("ctrl+alt+m")).toBe("Ctrl+Alt+M");
    expect(formatCombo("super+f13")).toBe("Win+F13");
  });
});
