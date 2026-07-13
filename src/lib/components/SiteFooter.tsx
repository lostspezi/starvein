import Image from "next/image";
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
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-10">
        <div className="flex items-center gap-4">
          {/* Offizielles Fankit-Logo — laut RSI-Vorgabe mind. 50 % Deckkraft */}
          <Image
            src="/made-by-the-community.png"
            alt={t("footer.communityLogoAlt")}
            width={64}
            height={64}
            className="size-16 shrink-0 opacity-80"
          />
          <p className="max-w-prose">{t("disclaimer.text")}</p>
        </div>
        <p className="md:text-center">
          {t("footer.craftedBy")}{" "}
          <a href={TWITCH_URL} className={linkClasses} {...externalProps}>
            lostspezi
          </a>
        </p>
        <nav
          aria-label={t("footer.linksLabel")}
          className="flex flex-col gap-2 md:items-end md:text-right"
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
      </div>
    </footer>
  );
}
