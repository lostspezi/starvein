import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { GroundSignatureExplainer } from "./GroundSignatureExplainer";

const minerals = [
  { code: "HADA", name: "Hadanite" },
  { code: "DOLI", name: "Dolivine" },
];

describe("GroundSignatureExplainer", () => {
  it("explains the size-based signatures 3000 (FPS) and 4000 (ROC)", () => {
    renderWithIntl(<GroundSignatureExplainer minerals={minerals} />, {
      locale: "de",
    });

    expect(screen.getByText("3000")).toBeVisible();
    expect(screen.getByText("4000")).toBeVisible();
    expect(
      screen.getByText(/nur die Größe des Vorkommens/, { exact: false }),
    ).toBeVisible();
  });

  it("links the possible ground minerals to their detail pages", () => {
    renderWithIntl(<GroundSignatureExplainer minerals={minerals} />, {
      locale: "en",
    });

    expect(screen.getByRole("link", { name: "Hadanite" })).toHaveAttribute(
      "href",
      "/ores/hada",
    );
    expect(screen.getByRole("link", { name: "Dolivine" })).toHaveAttribute(
      "href",
      "/ores/doli",
    );
  });
});
