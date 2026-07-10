import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  it("shows the app title as heading", () => {
    renderWithIntl(<HomePage />, { locale: "en" });
    expect(
      screen.getByRole("heading", { level: 1, name: "STARVEIN" }),
    ).toBeVisible();
  });

  it("shows the localized tagline", () => {
    renderWithIntl(<HomePage />, { locale: "de" });
    expect(
      screen.getByText(
        "Community-Mining-Referenz für Star Citizen — Erze, Fundorte, Scan-Signaturen.",
      ),
    ).toBeVisible();
  });

  it("renders the hero search with its own accessible name", () => {
    renderWithIntl(<HomePage />, { locale: "en" });
    expect(
      screen.getByRole("combobox", { name: "Find ores and locations" }),
    ).toBeVisible();
  });

  it("staggers the hero reveal animation", () => {
    renderWithIntl(<HomePage />, { locale: "en" });
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("animate-reveal");
  });
});
