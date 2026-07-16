import { useTranslations } from "next-intl";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import type { ExplorerRow } from "./explorer.service";
import { ExplorerTable } from "./ExplorerTable";

/**
 * Kompaktes Vorkommen-Widget der Startseite: die wahrscheinlichsten Fundorte,
 * pro Erz genau einer (Dedupe passiert in findTopOreRows). Die volle Tabelle
 * lebt auf /occurrences — der Link trägt die Gesamtzahl.
 */
export function TopOccurrencesWidget({
  rows,
  total,
  favoriteKeys,
  isAuthenticated,
  children,
}: {
  rows: ExplorerRow[];
  total: number;
  favoriteKeys: Set<string>;
  isAuthenticated: boolean;
  /** Optionaler Filter-Slot zwischen Überschrift und Tabelle. */
  children?: React.ReactNode;
}) {
  const t = useTranslations("home.topOres");

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">{t("heading")}</h2>
        <GlowLink href="/occurrences" className="text-sm">
          {t("viewAll", { total })}
        </GlowLink>
      </div>
      {children}
      <ExplorerTable
        rows={rows}
        favoriteKeys={favoriteKeys}
        isAuthenticated={isAuthenticated}
      />
    </section>
  );
}
