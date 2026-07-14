import { FAN_DISCLAIMER_TEXT, RSI_URL } from "@starvein/shared/branding";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslations } from "use-intl";

/**
 * App-Footer mit dem Pflicht-Disclaimer laut RSI-Fansite-Policy
 * (CLAUDE.md §2). Der englische Wortlaut ist von RSI vorgegeben und wird
 * nie übersetzt oder gekürzt. Wird im App-Shell auf jedem Screen gerendert
 * (inkl. Login); abgesichert durch AppFooter.test.tsx — den permanenten
 * Branding-Compliance-Test der Desktop-App.
 */
export function AppFooter() {
  const t = useTranslations("common");

  return (
    <footer className="border-glass-border bg-glass text-text-muted flex flex-col gap-2 border-t px-4 py-3 text-xs backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-prose">{FAN_DISCLAIMER_TEXT}</p>
      <a
        href={RSI_URL}
        onClick={(event) => {
          // Externe Links im System-Browser öffnen, nicht in der Webview.
          event.preventDefault();
          void openUrl(RSI_URL);
        }}
        className="text-accent-primary hover:text-accent-glow shrink-0 transition-colors duration-150"
      >
        {t("footer.rsiLinkLabel")}
      </a>
    </footer>
  );
}
