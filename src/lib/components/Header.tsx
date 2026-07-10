import { useTranslations } from "next-intl";
import { UserMenu } from "@/features/auth/UserMenu";
import { LocaleSwitcher } from "@/features/i18n-switcher/LocaleSwitcher";
import { SearchBox } from "@/features/search/SearchBox";
import { Link } from "@/i18n/navigation";
import { NavLinks } from "./NavLinks";

/**
 * Sticky HUD-Header mit Glas-Optik. Mobile-first: Auf schmalen Screens bricht
 * der Header in drei Zeilen um (Brand + Sprache / Navigation / Suche), ab sm
 * eine Zeile via order-Utilities.
 */
export function Header() {
  const t = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-glass-border bg-glass px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-widest text-text-primary transition-colors duration-150 hover:text-accent-ice"
        >
          {t("appName")}
        </Link>

        <div className="ml-auto flex items-center gap-3 sm:order-4">
          <UserMenu />
          <LocaleSwitcher />
        </div>

        <nav className="order-3 flex w-full gap-4 text-sm sm:order-2 sm:w-auto">
          <NavLinks />
        </nav>

        <div className="order-4 w-full sm:order-3 sm:ml-auto sm:w-64">
          <SearchBox />
        </div>
      </div>
    </header>
  );
}
