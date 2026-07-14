/**
 * PERMANENTER Compliance-Test (RSI-Fansite-Policy, CLAUDE.md §2) —
 * Desktop-Pendant zu e2e/branding-compliance.spec.ts der Web-App.
 *
 * Dieser Test darf NIEMALS gelöscht, geskippt oder abgeschwächt werden.
 * Der Disclaimer-String steht hier bewusst als Literal (nicht als Import
 * aus @starvein/shared), damit auch eine versehentliche Änderung der
 * geteilten Konstante den Test fehlschlagen lässt.
 */
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { describe, expect, it } from "vitest";
import { messages, type AppLocale } from "../i18n/messages";
import { AppFooter } from "./AppFooter";

const EXPECTED_DISCLAIMER =
  "This is an unofficial Star Citizen fansite, not affiliated with the Cloud Imperium group of companies. All content on this site not authored by its host or users are property of their respective owners.";

const EXPECTED_RSI_URL = "https://robertsspaceindustries.com";

function renderFooter(locale: AppLocale) {
  return render(
    <IntlProvider locale={locale} messages={messages[locale]}>
      <AppFooter />
    </IntlProvider>,
  );
}

describe.each(["de", "en"] as const)("AppFooter (locale %s)", (locale) => {
  it("shows the verbatim fansite disclaimer", () => {
    renderFooter(locale);
    expect(screen.getByText(EXPECTED_DISCLAIMER)).toBeVisible();
  });

  it("links to the official RSI website", () => {
    const { container } = renderFooter(locale);
    const rsiLink = container.querySelector(`a[href^="${EXPECTED_RSI_URL}"]`);
    expect(rsiLink).toBeVisible();
  });
});
