import "@testing-library/jest-dom/vitest";
import { createElement, type ReactNode } from "react";
import { vi } from "vitest";

/**
 * Standard-Mock für die next-intl-Navigation in Component-Tests:
 * Link rendert als schlichtes <a href>, Router-Hooks sind No-Ops.
 * Einzelne Tests können das Modul mit eigenem vi.mock übersteuern
 * (siehe LocaleSwitcher.test.tsx).
 */
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
  usePathname: () => "/",
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  redirect: vi.fn(),
  getPathname: () => "/",
}));
