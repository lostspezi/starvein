import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { Breadcrumbs } from "./Breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders links for ancestors and marks the last item as current", () => {
    renderWithIntl(
      <Breadcrumbs
        items={[
          { label: "Locations", href: "/locations" },
          { label: "Stanton", href: "/locations/stanton" },
          { label: "Yela" },
        ]}
      />,
      { locale: "en" },
    );

    expect(screen.getByRole("link", { name: "Locations" })).toHaveAttribute(
      "href",
      "/locations",
    );
    expect(screen.getByRole("link", { name: "Stanton" })).toHaveAttribute(
      "href",
      "/locations/stanton",
    );

    const current = screen.getByText("Yela");
    expect(current).toBeVisible();
    expect(current).toHaveAttribute("aria-current", "page");
    expect(
      screen.queryByRole("link", { name: "Yela" }),
    ).not.toBeInTheDocument();
  });

  it("emits BreadcrumbList JSON-LD when a locale is provided", () => {
    const { container } = renderWithIntl(
      <Breadcrumbs
        locale="en"
        items={[{ label: "Ores", href: "/ores" }, { label: "Hadanite" }]}
      />,
      { locale: "en" },
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).not.toBeNull();
    const parsed = JSON.parse(script!.textContent ?? "");
    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Ores",
        item: "https://starvein.app/en/ores",
      },
      { "@type": "ListItem", position: 2, name: "Hadanite" },
    ]);
  });

  it("emits no JSON-LD without a locale", () => {
    const { container } = renderWithIntl(
      <Breadcrumbs items={[{ label: "Ores" }]} />,
      { locale: "en" },
    );
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).toBeNull();
  });
});
