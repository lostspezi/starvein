import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { ApiQuickstart } from "./ApiQuickstart";

/**
 * Regression: der Envelope-Text enthält literale geschweifte Klammern —
 * ohne ICU-Escaping ('{ data, meta }') wirft next-intl
 * INVALID_ARGUMENT_TYPE und die Doku-Seite bricht.
 */
describe("ApiQuickstart", () => {
  it("renders the envelope note with literal braces (en)", () => {
    renderWithIntl(<ApiQuickstart />);
    expect(screen.getByText(/wrapped in \{ data, meta \}/)).toBeInTheDocument();
  });

  it("renders the envelope note with literal braces (de)", () => {
    renderWithIntl(<ApiQuickstart />, { locale: "de" });
    expect(
      screen.getByText(/in \{ data, meta \} verpackt/),
    ).toBeInTheDocument();
  });

  it("shows the curl example and the keys link", () => {
    renderWithIntl(<ApiQuickstart />);
    expect(
      screen.getByText(/curl -H "Authorization: Bearer/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /manage api keys/i }),
    ).toBeInTheDocument();
  });
});
