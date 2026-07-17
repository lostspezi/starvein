"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavDropdown } from "./NavDropdown";
import { isRouteActive, NAV_ITEMS, navTriggerClasses } from "./nav-items";

/**
 * Primärnavigation: Direktlinks mit Glow-Indikator auf der aktiven Route
 * plus Disclosure-Gruppen (NavDropdown). Es ist immer höchstens ein Panel
 * offen — der State liegt deshalb hier und nicht in den Gruppen.
 */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <>
      {NAV_ITEMS.map((item) => {
        if (item.kind === "group") {
          return (
            <NavDropdown
              key={item.key}
              item={item}
              open={openGroup === item.key}
              onOpenChange={(open) => setOpenGroup(open ? item.key : null)}
              onNavigate={onNavigate}
            />
          );
        }
        const isActive = isRouteActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
            className={navTriggerClasses(isActive)}
          >
            {t(`nav.${item.key}`)}
          </Link>
        );
      })}
    </>
  );
}
