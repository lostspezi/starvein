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
});
