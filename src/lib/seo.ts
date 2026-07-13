import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * Kanonische Basis-URL der Seite. In Preview-/Testumgebungen per
 * NEXT_PUBLIC_SITE_URL überschreibbar, sonst Produktionsdomain.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://starvein.app";

export const SITE_NAME = "STARVEIN";

/** Open-Graph-Locale-Codes je App-Locale. */
export const OG_LOCALES: Record<string, string> = {
  de: "de_DE",
  en: "en_US",
};

/**
 * Canonical- und hreflang-Alternates für eine lokalisierte Route.
 * `path` ist der Pfad ohne Locale-Prefix, z. B. "/ores/hada" oder "" (Home).
 * x-default zeigt auf die Default-Locale-Variante.
 */
export function localeAlternates(
  locale: string,
  path = "",
): Metadata["alternates"] {
  return {
    canonical: `${SITE_URL}/${locale}${path}`,
    languages: {
      ...Object.fromEntries(
        routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`]),
      ),
      "x-default": `${SITE_URL}/${routing.defaultLocale}${path}`,
    },
  };
}

/** Metadata-Baustein für nutzerspezifische Seiten, die nicht in den Index sollen. */
export const NO_INDEX: Metadata["robots"] = {
  index: false,
  follow: false,
};

/**
 * Vollständige Seiten-Metadata (Titel, Description, Canonical, hreflang,
 * Open Graph, Twitter Card) für eine lokalisierte Route. Der Seitentitel
 * läuft durch das Title-Template des Layouts ("%s · STARVEIN").
 */
export function pageMetadata(opts: {
  locale: string;
  path: string;
  title: string;
  description?: string;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: localeAlternates(opts.locale, opts.path),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${opts.title} · ${SITE_NAME}`,
      description: opts.description,
      url: `${SITE_URL}/${opts.locale}${opts.path}`,
      locale: OG_LOCALES[opts.locale],
    },
    twitter: {
      card: "summary",
      title: `${opts.title} · ${SITE_NAME}`,
      description: opts.description,
    },
  };
}
