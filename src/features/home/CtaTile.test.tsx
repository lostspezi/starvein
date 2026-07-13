import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { CtaTile } from "./CtaTile";

describe("CtaTile", () => {
  it("links to the builder and the loadout browser", () => {
    renderWithIntl(<CtaTile />, { locale: "en" });

    expect(
      screen.getByRole("heading", { name: "Build your own" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Put together a loadout for your ship or ROC and share it with the community.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Create loadout" }),
    ).toHaveAttribute("href", "/loadouts/new");
    expect(
      screen.getByRole("link", { name: "Browse all loadouts" }),
    ).toHaveAttribute("href", "/loadouts");
  });
});
