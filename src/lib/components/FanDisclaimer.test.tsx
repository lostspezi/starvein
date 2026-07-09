import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AppLocale } from "@/i18n/messages";
import { FAN_DISCLAIMER_TEXT, RSI_URL } from "@/test/factories";
import { renderWithIntl } from "@/test/render";
import { FanDisclaimer } from "./FanDisclaimer";

describe.each<AppLocale>(["de", "en"])("FanDisclaimer (%s)", (locale) => {
  it("shows the verbatim policy disclaimer", () => {
    renderWithIntl(<FanDisclaimer />, { locale });
    expect(screen.getByText(FAN_DISCLAIMER_TEXT)).toBeVisible();
  });

  it("links visibly to the official RSI website", () => {
    renderWithIntl(<FanDisclaimer />, { locale });
    const link = screen.getByRole("link");
    expect(link).toBeVisible();
    expect(link).toHaveAttribute("href", RSI_URL);
  });
});
