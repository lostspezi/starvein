import { useTranslations } from "next-intl";

/**
 * Pflicht-Disclaimer laut RSI-Fansite-Policy (CLAUDE.md §2): Der englische
 * Wortlaut ist von RSI vorgegeben und steht identisch in allen Locales —
 * niemals übersetzen, kürzen oder verstecken. Wird im Root-Layout auf jeder
 * Seite gerendert; abgesichert durch e2e/branding-compliance.spec.ts.
 */
export function FanDisclaimer() {
  const t = useTranslations("common.disclaimer");

  return (
    <footer className="border-t border-bg-nebula-2 bg-bg-nebula px-4 py-4 text-sm text-text-muted sm:px-6">
      <p>{t("text")}</p>
      <p className="mt-2">
        <a
          href="https://robertsspaceindustries.com"
          className="text-accent-primary underline hover:text-accent-glow"
          rel="noopener noreferrer"
        >
          {t("rsiLinkLabel")}
        </a>
      </p>
    </footer>
  );
}
