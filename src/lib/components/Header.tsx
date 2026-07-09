import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/features/i18n-switcher/LocaleSwitcher";
import { Link } from "@/i18n/navigation";

export function Header() {
  const t = useTranslations("common");

  return (
    <header className="flex items-center justify-between border-b border-bg-nebula-2 bg-bg-nebula px-6 py-3">
      <Link
        href="/"
        className="font-mono text-sm font-semibold tracking-widest text-text-primary"
      >
        {t("appName")}
      </Link>
      <LocaleSwitcher />
    </header>
  );
}
