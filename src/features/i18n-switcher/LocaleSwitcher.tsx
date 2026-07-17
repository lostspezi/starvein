"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";

type LocaleSwitcherProps = {
  /**
   * "full" zeigt die ausgeschriebenen Sprachnamen (Mobile-Drawer),
   * "compact" einen segmentierten DE|EN-Toggle für den Desktop-Header —
   * der Accessible Name bleibt in beiden Varianten der volle Sprachname.
   */
  variant?: "full" | "compact";
};

export function LocaleSwitcher({ variant = "full" }: LocaleSwitcherProps) {
  const activeLocale = useLocale();
  const t = useTranslations("localeSwitcher");
  const pathname = usePathname();
  const router = useRouter();
  const compact = variant === "compact";

  return (
    <nav
      aria-label={t("label")}
      className={
        compact
          ? "flex items-center overflow-hidden rounded border border-glass-border"
          : "flex gap-2"
      }
    >
      {routing.locales.map((locale, index) => {
        const isActive = locale === activeLocale;
        return (
          <button
            key={locale}
            type="button"
            aria-current={isActive ? "true" : undefined}
            aria-label={compact ? t(`locales.${locale}`) : undefined}
            onClick={() => {
              if (!isActive) {
                router.replace(pathname, { locale });
              }
            }}
            className={
              compact
                ? cn(
                    "px-2 py-1 text-xs font-medium transition-colors duration-150",
                    index > 0 && "border-l border-glass-border",
                    isActive
                      ? "text-accent-cyan"
                      : "text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary",
                  )
                : isActive
                  ? "rounded px-2 py-1 text-sm font-medium text-accent-glow"
                  : "rounded px-2 py-1 text-sm text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary"
            }
          >
            {compact ? t(`short.${locale}`) : t(`locales.${locale}`)}
          </button>
        );
      })}
    </nav>
  );
}
