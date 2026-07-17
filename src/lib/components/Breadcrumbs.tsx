import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd, type BreadcrumbItem } from "@/lib/structured-data";
import { JsonLd } from "./JsonLd";

export type { BreadcrumbItem };

/**
 * Brotkrumen-Navigation für Detailseiten. Mit `locale` wird zusätzlich
 * BreadcrumbList-JSON-LD aus denselben Items emittiert (eine Quelle für
 * sichtbare Navigation und strukturierte Daten).
 */
export function Breadcrumbs({
  items,
  locale,
}: {
  items: BreadcrumbItem[];
  locale?: string;
}) {
  const t = useTranslations("common");

  return (
    <>
      {locale ? <JsonLd data={breadcrumbJsonLd(locale, items)} /> : null}
      <nav
        aria-label={t("breadcrumbs.label")}
        className="flex flex-wrap items-center gap-1 text-sm text-text-muted"
      >
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link
                href={item.href}
                className="transition-colors duration-150 hover:text-text-primary hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-text-primary">
                {item.label}
              </span>
            )}
          </Fragment>
        ))}
      </nav>
    </>
  );
}
