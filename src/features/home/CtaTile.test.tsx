import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { CtaTile } from "./CtaTile";

describe("CtaTile", () => {
  it("links to the loadout builder and the guide editor", () => {
    renderWithIntl(<CtaTile />, { locale: "en" });

    expect(
      screen.getByRole("heading", { name: "Share your knowledge" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Put together a loadout for your ship or ROC, or write a guide for the community.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Create loadout" }),
    ).toHaveAttribute("href", "/loadouts/new");
    expect(screen.getByRole("link", { name: "Write a guide" })).toHaveAttribute(
      "href",
      "/guides/new",
    );
  });
});
