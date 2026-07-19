import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { LocationGuideSection } from "./LocationGuideSection";
import type { LocationGuide } from "./location-guides.schema";

const bilingual: LocationGuide = {
  systemCode: "NYX",
  bodySlug: "glaciem-ring",
  note_de: "Nach Nyx springen, dann per Quantum zu Delamar.",
  note_en: "Jump into Nyx, then quantum travel to Delamar.",
};

describe("LocationGuideSection", () => {
  it("renders the heading", () => {
    renderWithIntl(<LocationGuideSection guide={bilingual} locale="en" />, {
      locale: "en",
    });
    expect(
      screen.getByRole("heading", { name: "How to get there" }),
    ).toBeVisible();
  });

  it("shows the English note for the en locale", () => {
    renderWithIntl(<LocationGuideSection guide={bilingual} locale="en" />, {
      locale: "en",
    });
    expect(screen.getByText(/quantum travel to Delamar/)).toBeVisible();
    expect(screen.queryByText(/per Quantum zu Delamar/)).toBeNull();
  });

  it("shows the German note for the de locale", () => {
    renderWithIntl(<LocationGuideSection guide={bilingual} locale="de" />, {
      locale: "de",
    });
    expect(screen.getByText(/per Quantum zu Delamar/)).toBeVisible();
  });

  it("falls back to the other language when the preferred note is missing", () => {
    const enOnly: LocationGuide = {
      systemCode: "NYX",
      bodySlug: "keeger-belt",
      note_en: "English only route.",
    };
    renderWithIntl(<LocationGuideSection guide={enOnly} locale="de" />, {
      locale: "de",
    });
    expect(screen.getByText("English only route.")).toBeVisible();
  });

  it("renders drop routes with a formatted distance", () => {
    const withRoutes: LocationGuide = {
      systemCode: "STANTON",
      bodySlug: "aaron-halo",
      routes: [{ from: "Hurston", to: "ArcCorp", dropDistanceKm: 9_500_000 }],
    };
    renderWithIntl(<LocationGuideSection guide={withRoutes} locale="en" />, {
      locale: "en",
    });
    expect(screen.getByText("Hurston")).toBeVisible();
    expect(screen.getByText("ArcCorp")).toBeVisible();
    expect(screen.getByText("9,500,000 km")).toBeVisible();
  });

  it("renders no route table when there are no routes", () => {
    renderWithIntl(<LocationGuideSection guide={bilingual} locale="en" />, {
      locale: "en",
    });
    expect(screen.queryByRole("table")).toBeNull();
  });
});
