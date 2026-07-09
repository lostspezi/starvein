import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { BodyList } from "./BodyList";
import type { CelestialBody } from "./locations.schema";

const bodies: CelestialBody[] = [
  {
    slug: "yela",
    systemCode: "STANTON",
    type: "moon",
    name: "Yela",
    parentSlug: "crusader",
    uexId: 75,
  },
  {
    slug: "cru-l1",
    systemCode: "STANTON",
    type: "lagrangePoint",
    name: "Crusader Lagrange Point 1",
    parentSlug: "crusader",
    uexId: 331,
  },
];

describe("BodyList", () => {
  it("links each body to its detail page", () => {
    renderWithIntl(<BodyList bodies={bodies} />, { locale: "en" });

    expect(screen.getByRole("link", { name: /Yela/ })).toHaveAttribute(
      "href",
      "/locations/stanton/yela",
    );
  });

  it("shows the localized body type", () => {
    renderWithIntl(<BodyList bodies={bodies} />, { locale: "de" });

    expect(screen.getByText("Mond")).toBeVisible();
    expect(screen.getByText("Lagrange-Punkt")).toBeVisible();
  });

  it("shows an empty state without bodies", () => {
    renderWithIntl(<BodyList bodies={[]} />, { locale: "en" });
    expect(screen.getByText("No locations here yet.")).toBeVisible();
  });
});
