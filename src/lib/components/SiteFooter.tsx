import { useTranslations } from "next-intl";
import {
  GITHUB_BUG_URL,
  GITHUB_FEATURE_URL,
  GITHUB_REPO_URL,
  TWITCH_URL,
} from "@/lib/site-config";

const RSI_URL = "https://robertsspaceindustries.com";

const linkClasses =
  "text-accent-primary transition-colors duration-150 hover:text-accent-glow";

const externalProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

/**
 * Site-Footer mit Projekt-Links und dem Pflicht-Disclaimer laut
 * RSI-Fansite-Policy (CLAUDE.md §2): Der englische Wortlaut ist von RSI
 * vorgegeben und steht identisch in allen Locales — niemals übersetzen,
 * kürzen oder verstecken. Wird im Root-Layout auf jeder Seite gerendert;
 * abgesichert durch e2e/branding-compliance.spec.ts.
 */
export function SiteFooter() {
  const t = useTranslations("common");

  return (
    <footer className="border-t border-glass-border bg-glass px-4 py-6 text-sm text-text-muted backdrop-blur-md sm:px-6">
      <div className="flex flex-col gap-4">
        <nav
          aria-label={t("footer.linksLabel")}
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6"
        >
          <a href={GITHUB_REPO_URL} className={linkClasses} {...externalProps}>
            {t("footer.github")}
          </a>
          <a href={GITHUB_BUG_URL} className={linkClasses} {...externalProps}>
            {t("footer.reportBug")}
          </a>
          <a
            href={GITHUB_FEATURE_URL}
            className={linkClasses}
            {...externalProps}
          >
            {t("footer.requestFeature")}
          </a>
          <a href={RSI_URL} className={linkClasses} {...externalProps}>
            {t("disclaimer.rsiLinkLabel")}
          </a>
        </nav>
        <p>{t("disclaimer.text")}</p>
        <p>
          {t("footer.craftedBy")}{" "}
          <a href={TWITCH_URL} className={linkClasses} {...externalProps}>
            lostspezi
          </a>
        </p>
      </div>
    </footer>
  );
}
