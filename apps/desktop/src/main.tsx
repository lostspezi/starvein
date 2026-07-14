import React from "react";
import ReactDOM from "react-dom/client";
import { IntlProvider } from "use-intl";
import { App } from "./App";
import { detectLocale, messages } from "./i18n/messages";
import "./styles/globals.css";

const locale = detectLocale();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <IntlProvider
      locale={locale}
      messages={messages[locale]}
      timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
    >
      <App />
    </IntlProvider>
  </React.StrictMode>,
);
