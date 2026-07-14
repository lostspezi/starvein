import React from "react";
import ReactDOM from "react-dom/client";
import { IntlProvider } from "use-intl";
import { App } from "./App";
import { detectLocale, messages } from "./i18n/messages";
import { setServerUrl } from "./lib/config";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  type AppSettings,
} from "./lib/settings";
import { SettingsProvider, useSettings } from "./SettingsContext";
import "./styles/globals.css";

function IntlLayer() {
  const { settings } = useSettings();
  const locale = settings.locale ?? detectLocale();
  return (
    <IntlProvider
      locale={locale}
      messages={messages[locale]}
      timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
    >
      <App />
    </IntlProvider>
  );
}

async function bootstrap() {
  // Settings vor dem ersten Render laden: Locale und Server-URL müssen
  // stehen, bevor irgendein API-Call oder Text rausgeht.
  const initial: AppSettings = await loadSettings().catch(
    () => DEFAULT_SETTINGS,
  );
  setServerUrl(initial.serverUrl);

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <SettingsProvider initial={initial}>
        <IntlLayer />
      </SettingsProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
