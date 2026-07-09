import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { StarSystem } from "./locations.schema";
import { SystemList } from "./SystemList";

const systems: StarSystem[] = [
  { code: "STANTON", name: "Stanton", status: "live", uexId: 68 },
  { code: "PYRO", name: "Pyro", status: "live", uexId: 64 },
];

describe("SystemList", () => {
  it("links each system to its browser page", () => {
    renderWithIntl(<SystemList systems={systems} />, { locale: "en" });

    expect(screen.getByRole("link", { name: /Stanton/ })).toHaveAttribute(
      "href",
      "/locations/stanton",
    );
    expect(screen.getByRole("link", { name: /Pyro/ })).toHaveAttribute(
      "href",
      "/locations/pyro",
    );
  });
});
