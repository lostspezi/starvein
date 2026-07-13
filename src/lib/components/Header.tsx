import { useTranslations } from "next-intl";
import { UserMenu } from "@/features/auth/UserMenu";
import { LocaleSwitcher } from "@/features/i18n-switcher/LocaleSwitcher";
import { SearchBox } from "@/features/search/SearchBox";
import { Link } from "@/i18n/navigation";
import { HeaderNav } from "./HeaderNav";

/**
 * Sticky HUD-Header mit Glas-Optik. Mobile-first als Grid: Burger links,
 * Titel zentriert, User-Menü rechts; darunter das einklappbare Nav-Panel
 * (inkl. Sprachauswahl) und die Suche als volle Zeilen. Ab sm eine
 * Flex-Zeile via order-Utilities, Sprachauswahl im rechten Cluster.
 */
export function Header() {
  const t = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-glass-border bg-glass px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-6 gap-y-3 sm:flex sm:flex-wrap">
        <HeaderNav />

        <Link
          href="/"
          className="order-2 font-mono text-sm font-semibold tracking-widest text-text-primary transition-colors duration-150 hover:text-accent-ice sm:order-1"
        >
          {t("appName")}
        </Link>

        <div className="order-3 flex items-center justify-self-end gap-3 sm:order-4">
          <UserMenu />
          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>
        </div>

        <div className="order-5 col-span-full w-full sm:order-3 sm:ml-auto sm:w-64">
          <SearchBox />
        </div>
      </div>
    </header>
  );
}
