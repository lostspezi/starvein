"use client";

import { useId, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { isRouteActive, navTriggerClasses, type NavItem } from "./nav-items";

type NavDropdownProps = {
  item: Extract<NavItem, { kind: "group" }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: () => void;
};

/**
 * Nav-Gruppe als Disclosure: unter sm eine statische Drawer-Sektion
 * (Label + Kind-Links), ab sm ein Click-to-open-Trigger mit schwebendem
 * Glass-Panel. Jeder Kind-Link existiert genau einmal im DOM — Playwright-
 * Strict-Mode zählt versteckte Duplikate mit.
 */
export function NavDropdown({
  item,
  open,
  onOpenChange,
  onNavigate,
}: NavDropdownProps) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const groupActive = item.children.some((child) =>
    isRouteActive(pathname, child.href),
  );

  return (
    <div
      className="relative flex flex-col gap-3 sm:block"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          // Nicht bis zum HeaderNav durchreichen — sonst klappt zusätzlich
          // der Mobile-Drawer zu und stiehlt den Fokus auf den Burger.
          event.stopPropagation();
          onOpenChange(false);
          triggerRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          onOpenChange(false);
        }
      }}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted sm:hidden">
        {t(`nav.groups.${item.key}`)}
      </span>

      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "hidden items-center gap-1 sm:inline-flex",
          navTriggerClasses(groupActive),
        )}
      >
        {t(`nav.groups.${item.key}`)}
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        id={panelId}
        className={cn(
          "flex flex-col gap-3 pl-3",
          // Ab sm entspricht das panelClasses({ variant: "glass" }) — die
          // Primitive lässt sich nicht breakpoint-scopen, daher hier bewusst
          // sm:-präfixiert dupliziert (dokumentierte Ausnahme, MASTER.md §9).
          "sm:absolute sm:left-0 sm:top-full sm:z-10 sm:mt-2 sm:w-48 sm:gap-0 sm:py-1 sm:pl-0",
          "sm:rounded-lg sm:border sm:border-glass-border sm:bg-glass sm:shadow-lg sm:backdrop-blur-md",
          open ? "sm:flex sm:animate-reveal" : "sm:hidden",
        )}
      >
        {item.children.map((child) => {
          const isActive = isRouteActive(pathname, child.href);
          return (
            <Link
              key={child.href}
              href={child.href}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                onOpenChange(false);
                onNavigate?.();
              }}
              className={cn(
                "py-0.5 transition-colors duration-150 sm:block sm:w-full sm:px-3 sm:py-2 sm:hover:bg-bg-nebula-2",
                isActive
                  ? "text-accent-cyan"
                  : "text-text-muted hover:text-text-primary",
              )}
            >
              {t(`nav.${child.key}`)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
