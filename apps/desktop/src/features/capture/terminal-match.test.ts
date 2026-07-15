import { describe, expect, it } from "vitest";
import { matchTerminal } from "./terminal-match";

/** Reale Katalognamen (UEX-Sync, Stand 15.07.2026). */
const TERMINALS = [
  { terminalId: 788, terminalName: "Refinement Center - Levski" },
  { terminalId: 246, terminalName: "Refinement Processing - ARC-L1" },
  { terminalId: 247, terminalName: "Refinement Processing - ARC-L2" },
  { terminalId: 245, terminalName: "Refinement Processing - CRU-L1" },
  { terminalId: 431, terminalName: "Refinement Center - Checkmate" },
];

describe("matchTerminal", () => {
  it("matches the station header including the ARC-L1→ARC-LI OCR misread", () => {
    const lines = [
      "REFINEMENT CENTER",
      "ARC-LI WIDE FOREST STATION",
      "PROCESSING",
    ];
    expect(matchTerminal(lines, TERMINALS)).toBe("246");
  });

  it("never matches the generic module header alone", () => {
    // "REFINEMENT CENTER" steht auf JEDEM Terminal — darf nicht auf
    // "Refinement Center - Levski" matchen (realer Fehlgriff, 15.07.2026).
    expect(matchTerminal(["REFINEMENT CENTER", "PROCESSING"], TERMINALS)).toBe(
      "",
    );
  });

  it("distinguishes lagrange stations by their digit", () => {
    expect(matchTerminal(["ARC-L2 LIVELY PATHWAY STATION"], TERMINALS)).toBe(
      "247",
    );
    expect(matchTerminal(["CRU-L1 AMBITIOUS DREAM STATION"], TERMINALS)).toBe(
      "245",
    );
  });

  it("matches named stations like Levski or Checkmate", () => {
    expect(matchTerminal(["LEVSKI LANDING ZONE"], TERMINALS)).toBe("788");
    expect(matchTerminal(["CHECKMATE STATION"], TERMINALS)).toBe("431");
  });

  it("returns empty when nothing matches", () => {
    expect(matchTerminal(["WORK ORDER", "SETUP"], TERMINALS)).toBe("");
    expect(matchTerminal([], TERMINALS)).toBe("");
  });
});
