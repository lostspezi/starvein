import { screen } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { Material } from "./materials.schema";
import { MaterialListSection } from "./MaterialListSection";

const materials: Material[] = [
  {
    code: "HADA",
    name: "Hadanite",
    kind: "item",
    oreCode: "HADA",
    wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
    gameVersion: "4.8",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
  },
  {
    code: "PRESSURIZED_ICE",
    name: "Pressurized Ice",
    kind: "resource",
    wikiUuid: "1893e596-acaf-49bc-b367-e43e99c2925f",
    gameVersion: "4.8",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
  },
];

function renderSection(searchParams = "") {
  return renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams}>
      <MaterialListSection materials={materials} />
    </NuqsTestingAdapter>,
    { locale: "en" },
  );
}

describe("MaterialListSection", () => {
  it("shows all materials without URL state", () => {
    renderSection();
    expect(screen.getByText("Hadanite")).toBeVisible();
    expect(screen.getByText("Pressurized Ice")).toBeVisible();
  });

  it("filters client-side by search query from the URL", () => {
    renderSection("?q=hada");
    expect(screen.getByText("Hadanite")).toBeVisible();
    expect(screen.queryByText("Pressurized Ice")).not.toBeInTheDocument();
  });

  it("filters client-side by kind from the URL", () => {
    renderSection("?kind=resource");
    expect(screen.getByText("Pressurized Ice")).toBeVisible();
    expect(screen.queryByText("Hadanite")).not.toBeInTheDocument();
  });
});
