import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Panel } from "@/lib/components/ui/Panel";

const QUICK_LINKS = [
  { href: "/ores", key: "ores" },
  { href: "/signatures", key: "signatures" },
  { href: "/locations", key: "locations" },
  { href: "/compare", key: "compare" },
  { href: "/materials", key: "materials" },
  { href: "/blueprints", key: "blueprints" },
  { href: "/companion", key: "companion" },
] as const;

/** Schnelleinstieg in die Referenz-Seiten als Chip-Links (Nav-Labels). */
export function QuickLinksTile() {
  const t = useTranslations("home.quickLinks");
  const tNav = useTranslations("common.nav");

  return (
    <Panel className="flex h-full flex-col gap-3 p-4">
      <h3 className="text-sm font-medium text-text-muted">{t("heading")}</h3>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_LINKS.map(({ href, key }) => (
          <Link
            key={href}
            href={href}
            className="rounded-full border border-bg-nebula-2 px-3 py-1 text-xs text-accent-glow transition-all duration-150 hover:border-accent-cyan hover:text-text-primary"
          >
            {tNav(key)}
          </Link>
        ))}
      </div>
    </Panel>
  );
}
