import { routing } from "@/i18n/routing";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Schema.org-Builder für die JSON-LD-Blöcke der Seite. Bewusst minimales
 * Set: WebSite (Layout), BreadcrumbList (Detailseiten), Article (Guides) —
 * weitere Typen bringen für ein Spieldaten-Referenztool keine Rich Results.
 */

export type BreadcrumbItem = {
  label: string;
  /** Ohne href wird das Element als aktuelle Seite dargestellt. */
  href?: string;
};

export function websiteJsonLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description,
    inLanguage: [...routing.locales],
  };
}

export function breadcrumbJsonLd(locale: string, items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      // Das letzte Element (aktuelle Seite) trägt laut Google-Doku kein item.
      ...(item.href ? { item: `${SITE_URL}/${locale}${item.href}` } : {}),
    })),
  };
}

export function articleJsonLd(opts: {
  locale: string;
  path: string;
  title: string;
  description?: string;
  /** Sprache des angezeigten Inhalts (kann von der UI-Locale abweichen). */
  language: string;
  datePublished: string;
  dateModified: string;
  authorName?: string;
  tags: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    ...(opts.description ? { description: opts.description } : {}),
    inLanguage: opts.language,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    mainEntityOfPage: `${SITE_URL}/${opts.locale}${opts.path}`,
    ...(opts.authorName
      ? { author: { "@type": "Person", name: opts.authorName } }
      : {}),
    ...(opts.tags.length > 0 ? { keywords: opts.tags.join(", ") } : {}),
  };
}
