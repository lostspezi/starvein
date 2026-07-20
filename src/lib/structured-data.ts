import { routing } from "@/i18n/routing";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Schema.org-Builder für die JSON-LD-Blöcke der Seite: WebSite (Layout),
 * BreadcrumbList (Detailseiten), Article (Guides), Dataset (Referenz-Listen)
 * und FAQPage (Erz-Detail). Rich-Result-fähige Typen für ein
 * Spieldaten-Referenztool — alles Weitere brächte keinen Mehrwert.
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

/**
 * Dataset-Markup für die Kern-Referenzseiten (Erze, Vorkommen, Signaturen).
 * Positioniert STARVEIN als strukturierte, frei zugängliche Spieldaten-Quelle.
 * Bewusst ohne `license`: die zugrunde liegenden Spieldaten-Fakten gehören
 * ihren jeweiligen Eignern (CLAUDE.md §2) — wir maßen uns keine Lizenz an.
 */
export function datasetJsonLd(opts: {
  locale: string;
  path: string;
  name: string;
  description: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}/${opts.locale}${opts.path}`,
    inLanguage: [...routing.locales],
    isAccessibleForFree: true,
    creator: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    ...(opts.keywords && opts.keywords.length > 0
      ? { keywords: opts.keywords }
      : {}),
  };
}

/**
 * FAQPage-Markup aus Frage/Antwort-Paaren. Google verlangt, dass derselbe
 * Inhalt sichtbar auf der Seite steht — der Aufrufer rendert die Items daher
 * zusätzlich als sichtbaren FAQ-Block (siehe features/ores/OreFaq).
 */
export function faqPageJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
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
