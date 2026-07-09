"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const t = useTranslations("localeSwitcher");
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav aria-label={t("label")} className="flex gap-2">
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <button
            key={locale}
            type="button"
            aria-current={isActive ? "true" : undefined}
            onClick={() => {
              if (!isActive) {
                router.replace(pathname, { locale });
              }
            }}
            className={
              isActive
                ? "rounded px-2 py-1 text-sm font-medium text-accent-glow"
                : "rounded px-2 py-1 text-sm text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary"
            }
          >
            {t(`locales.${locale}`)}
          </button>
        );
      })}
    </nav>
  );
}
