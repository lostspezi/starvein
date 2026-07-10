import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { Link } from "@/i18n/navigation";

export type BreadcrumbItem = {
  label: string;
  /** Ohne href wird das Element als aktuelle Seite dargestellt. */
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const t = useTranslations("locations");

  return (
    <nav
      aria-label={t("breadcrumbLabel")}
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
  );
}
