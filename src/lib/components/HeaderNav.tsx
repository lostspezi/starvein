"use client";

import { useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/features/i18n-switcher/LocaleSwitcher";
import { cn } from "@/lib/cn";
import { NavLinks } from "./NavLinks";

/**
 * Burger-Toggle + Primärnavigation: mobil eingeklappt hinter dem Toggle
 * (inkl. Sprachauswahl), ab sm immer sichtbar (Toggle verschwindet, die
 * Sprachauswahl übernimmt der Desktop-Cluster im Header). Als
 * display:contents-Wrapper, damit Button und Nav direkte Grid-/Flex-Kinder
 * des Headers bleiben.
 */
export function HeaderNav() {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const navId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="contents"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          toggleRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={navId}
        aria-label={t("nav.toggle")}
        onClick={() => setOpen((previous) => !previous)}
        className="order-1 justify-self-start rounded p-1 text-text-muted transition-colors duration-150 hover:text-text-primary sm:hidden"
      >
        {open ? (
          <X aria-hidden className="size-5" />
        ) : (
          <Menu aria-hidden className="size-5" />
        )}
      </button>
      <nav
        id={navId}
        className={cn(
          // Ab sm eine eigene, umbruchfähige volle Zeile unter dem Header —
          // 10 Einträge passen bei Tablet-Breite nicht mehr neben Wortmarke
          // und Suche. Erst ab lg wieder inline in der Header-Zeile.
          "order-4 col-span-full w-full flex-col gap-3 text-sm",
          "sm:order-5 sm:flex sm:w-full sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-2",
          "lg:order-2 lg:w-auto lg:flex-nowrap",
          open ? "flex animate-reveal" : "hidden",
        )}
      >
        <NavLinks onNavigate={() => setOpen(false)} />
        <div
          className="border-t border-glass-border pt-3 sm:hidden"
          onClick={() => setOpen(false)}
        >
          <LocaleSwitcher />
        </div>
      </nav>
    </div>
  );
}
