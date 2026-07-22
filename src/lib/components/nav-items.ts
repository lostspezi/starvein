import { cn } from "@/lib/cn";

export type NavChild = { readonly href: string; readonly key: string };

export type NavItem =
  | { readonly kind: "link"; readonly href: string; readonly key: string }
  | {
      readonly kind: "group";
      readonly key: string;
      readonly children: readonly NavChild[];
    };

/**
 * Primärnavigation als 6 Top-Level-Einträge: die 11 Routen sind zu drei
 * Gruppen (Mining, Crafting, Flotte) plus drei Direktlinks gebündelt, damit
 * der Header ab xl einzeilig bleibt (siehe design-system/MASTER.md §7).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    kind: "group",
    key: "mining",
    children: [
      { href: "/ores", key: "ores" },
      { href: "/occurrences", key: "occurrences" },
      { href: "/signatures", key: "signatures" },
      { href: "/compare", key: "compare" },
      { href: "/calculator", key: "calculator" },
    ],
  },
  { kind: "link", href: "/locations", key: "locations" },
  {
    kind: "group",
    key: "crafting",
    children: [
      { href: "/materials", key: "materials" },
      { href: "/blueprints", key: "blueprints" },
    ],
  },
  {
    kind: "group",
    key: "fleet",
    children: [
      { href: "/ships", key: "ships" },
      { href: "/loadouts", key: "loadouts" },
    ],
  },
  { kind: "link", href: "/guides", key: "guides" },
  { kind: "link", href: "/companion", key: "companion" },
];

export function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Gemeinsame Optik für Direktlinks und Gruppen-Trigger: Glow-Unterstrich auf
 * der aktiven Route (HUD-Stil), gedämpfter Text sonst.
 */
export function navTriggerClasses(isActive: boolean): string {
  return cn(
    "relative py-0.5 transition-colors duration-150",
    "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:rounded-full after:transition-opacity after:duration-150",
    isActive
      ? "text-accent-cyan after:bg-accent-cyan after:opacity-100 after:shadow-glow-sm"
      : "text-text-muted after:opacity-0 hover:text-text-primary",
  );
}
