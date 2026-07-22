import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { DepositBadge } from "./OccurrenceBadges";

describe("DepositBadge", () => {
  it("shows the primary label for primary deposits", () => {
    renderWithIntl(<DepositBadge depositType="primary" />, { locale: "en" });
    expect(screen.getByText("Primary")).toBeVisible();
  });

  it("shows the byproduct label for secondary deposits", () => {
    renderWithIntl(<DepositBadge depositType="secondary" />, { locale: "en" });
    expect(screen.getByText("Byproduct")).toBeVisible();
  });

  it("renders nothing without deposit data (legacy rows)", () => {
    const { container } = renderWithIntl(<DepositBadge />, { locale: "en" });
    expect(container).toBeEmptyDOMElement();
  });
});
