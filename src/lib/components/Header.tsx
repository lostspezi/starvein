import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/features/i18n-switcher/LocaleSwitcher";
import { SearchBox } from "@/features/search/SearchBox";
import { Link } from "@/i18n/navigation";

/**
 * Mobile-first: Auf schmalen Screens bricht der Header in drei Zeilen um
 * (Brand + Sprache / Navigation / Suche), ab sm eine Zeile via order-Utilities.
 */
export function Header() {
  const t = useTranslations("common");

  return (
    <header className="border-b border-bg-nebula-2 bg-bg-nebula px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-widest text-text-primary"
        >
          {t("appName")}
        </Link>

        <div className="ml-auto sm:order-4">
          <LocaleSwitcher />
        </div>

        <nav className="order-3 flex w-full gap-4 text-sm sm:order-2 sm:w-auto">
          <Link
            href="/ores"
            className="text-text-muted hover:text-text-primary"
          >
            {t("nav.ores")}
          </Link>
          <Link
            href="/locations"
            className="text-text-muted hover:text-text-primary"
          >
            {t("nav.locations")}
          </Link>
          <Link
            href="/signatures"
            className="text-text-muted hover:text-text-primary"
          >
            {t("nav.signatures")}
          </Link>
        </nav>

        <div className="order-4 w-full sm:order-3 sm:ml-auto sm:w-64">
          <SearchBox />
        </div>
      </div>
    </header>
  );
}
