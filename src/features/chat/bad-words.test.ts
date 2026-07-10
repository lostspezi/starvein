import { describe, expect, it } from "vitest";
import { maskBadWords } from "./bad-words";

describe("maskBadWords", () => {
  it("masks an English bad word regardless of case", () => {
    const result = maskBadWords("you ASSHOLE!");

    expect(result).toBe("you ***!");
  });

  it("masks a German bad word", () => {
    const result = maskBadWords("So ein Arschloch.");

    expect(result).toBe("So ein ***.");
  });

  it("does not mask substrings inside clean words (Scunthorpe)", () => {
    const clean = "Scunthorpe assistance Analyse Klassiker";

    expect(maskBadWords(clean)).toBe(clean);
  });

  it("does not treat letters next to umlauts as word boundaries", () => {
    // "Marsch" enthält "arsch" — darf nicht maskiert werden
    expect(maskBadWords("Der Marsch beginnt")).toBe("Der Marsch beginnt");
    expect(maskBadWords("Überfickende")).toBe("Überfickende");
  });

  it("masks multiple occurrences and preserves surrounding text", () => {
    const result = maskBadWords("shit happens, so ein Scheiß, shit!");

    expect(result).toBe("*** happens, so ein ***, ***!");
  });

  it("masks declined German variants", () => {
    expect(maskBadWords("diese Wichser")).toBe("diese ***");
    expect(maskBadWords("du willst mich verarschen")).toBe(
      "du willst mich ***",
    );
  });

  it("leaves ore chatter untouched", () => {
    const chat = "QUAN bei Daymar, 3.5 SCU Bexalite gefunden";

    expect(maskBadWords(chat)).toBe(chat);
  });
});
