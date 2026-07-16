import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { QuickLinksTile } from "./QuickLinksTile";

describe("QuickLinksTile", () => {
  it("links the core reference pages as chips", () => {
    renderWithIntl(<QuickLinksTile />, { locale: "en" });

    expect(
      screen.getByRole("heading", { name: "Jump right in" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Ores" })).toHaveAttribute(
      "href",
      "/ores",
    );
    expect(screen.getByRole("link", { name: "Signatures" })).toHaveAttribute(
      "href",
      "/signatures",
    );
    expect(screen.getByRole("link", { name: "Locations" })).toHaveAttribute(
      "href",
      "/locations",
    );
    expect(screen.getByRole("link", { name: "Compare" })).toHaveAttribute(
      "href",
      "/compare",
    );
    expect(screen.getByRole("link", { name: "Materials" })).toHaveAttribute(
      "href",
      "/materials",
    );
    expect(screen.getByRole("link", { name: "Companion" })).toHaveAttribute(
      "href",
      "/companion",
    );
  });
});
