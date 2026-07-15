import { describe, expect, it } from "vitest";
import {
  buildLocationInput,
  emptyLocationDraft,
  isLocationDraftValid,
  type LocationDraft,
} from "./location-input";

function draft(overrides: Partial<LocationDraft> = {}): LocationDraft {
  return { ...emptyLocationDraft(), ...overrides };
}

describe("buildLocationInput", () => {
  it("splits a celestial body value into systemCode and bodySlug", () => {
    expect(
      buildLocationInput(
        draft({ kind: "celestialBody", bodyValue: "STANTON:daymar" }),
      ),
    ).toEqual({
      kind: "celestialBody",
      systemCode: "STANTON",
      bodySlug: "daymar",
    });
  });

  it("builds a terminal input from the numeric id", () => {
    expect(
      buildLocationInput(draft({ kind: "terminal", terminalId: "32" })),
    ).toEqual({ kind: "terminal", terminalId: 32 });
  });

  it("trims a custom label", () => {
    expect(
      buildLocationInput(
        draft({ kind: "custom", customLabel: "  im Schiff " }),
      ),
    ).toEqual({ kind: "custom", label: "im Schiff" });
  });
});

describe("isLocationDraftValid", () => {
  it("requires a picked body", () => {
    expect(isLocationDraftValid(draft({ kind: "celestialBody" }))).toBe(false);
    expect(
      isLocationDraftValid(
        draft({ kind: "celestialBody", bodyValue: "STANTON:daymar" }),
      ),
    ).toBe(true);
  });

  it("requires a picked terminal", () => {
    expect(isLocationDraftValid(draft({ kind: "terminal" }))).toBe(false);
    expect(
      isLocationDraftValid(draft({ kind: "terminal", terminalId: "32" })),
    ).toBe(true);
  });

  it("requires a non-empty custom label", () => {
    expect(isLocationDraftValid(draft({ kind: "custom" }))).toBe(false);
    expect(
      isLocationDraftValid(draft({ kind: "custom", customLabel: "   " })),
    ).toBe(false);
    expect(
      isLocationDraftValid(draft({ kind: "custom", customLabel: "hangar" })),
    ).toBe(true);
  });
});
