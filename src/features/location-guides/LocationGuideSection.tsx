import { useFormatter, useTranslations } from "next-intl";
import { Panel } from "@/lib/components/ui/Panel";
import type { LocationGuide } from "./location-guides.schema";

/**
 * "Anreise"-Block auf der Location-Detailseite: kuratierter Hinweis, wie man
 * zu einem Asteroiden-Feld/-Gürtel kommt, das man in SC nicht direkt anspringen
 * kann. Prosa-Note (sprachabhängig, mit Fallback) plus optionale QT-Drop-Routen
 * mit Ausstiegs-Distanz in Mono-Font (§7 "Instrumenten-Ablesung").
 */
export function LocationGuideSection({
  guide,
  locale,
}: {
  guide: LocationGuide;
  locale: string;
}) {
  const t = useTranslations("locationGuides");
  const format = useFormatter();

  const note =
    locale === "de"
      ? (guide.note_de ?? guide.note_en)
      : (guide.note_en ?? guide.note_de);

  return (
    <Panel variant="glass" className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-medium">{t("heading")}</h2>

      {note && (
        <p className="whitespace-pre-line text-sm text-text-muted">{note}</p>
      )}

      {guide.routes && guide.routes.length > 0 && (
        <table className="text-sm">
          <thead>
            <tr className="text-left text-text-muted">
              <th className="pr-6 font-normal">{t("from")}</th>
              <th className="pr-6 font-normal">{t("to")}</th>
              <th className="font-normal">{t("dropAt")}</th>
            </tr>
          </thead>
          <tbody>
            {guide.routes.map((route, index) => (
              <tr key={`${route.from}-${route.to}-${index}`}>
                <td className="pr-6">{route.from}</td>
                <td className="pr-6">{route.to}</td>
                <td className="font-mono text-accent-secondary">
                  {t("km", { distance: format.number(route.dropDistanceKm) })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
