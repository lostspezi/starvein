import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { loadMessages, type AppLocale } from "@/i18n/messages";

export function renderWithIntl(
  ui: ReactElement,
  { locale = "en" }: { locale?: AppLocale } = {},
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
}
