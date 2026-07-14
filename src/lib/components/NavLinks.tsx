"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const ROUTES = [
  { href: "/ores", key: "ores" },
  { href: "/locations", key: "locations" },
  { href: "/signatures", key: "signatures" },
  { href: "/compare", key: "compare" },
  { href: "/loadouts", key: "loadouts" },
  { href: "/companion", key: "companion" },
] as const;

/** Primärnavigation mit Glow-Indikator auf der aktiven Route (HUD-Stil). */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("common");
  const pathname = usePathname();

  return (
    <>
      {ROUTES.map(({ href, key }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "relative py-0.5 transition-colors duration-150",
              "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:rounded-full after:transition-opacity after:duration-150",
              isActive
                ? "text-accent-cyan after:bg-accent-cyan after:opacity-100 after:shadow-glow-sm"
                : "text-text-muted after:opacity-0 hover:text-text-primary",
            )}
          >
            {t(`nav.${key}`)}
          </Link>
        );
      })}
    </>
  );
}
