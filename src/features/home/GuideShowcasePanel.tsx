import { useTranslations } from "next-intl";
import { GuideCard } from "@/features/guides/GuideCard";
import type { GuideLanguage } from "@/features/guides/guides.languages";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { Panel } from "@/lib/components/ui/Panel";
import { FeatureGuideTile } from "./FeatureGuideTile";
import type { GuideShowcase } from "./guide-showcase.service";

/**
 * Guide-Sektion der Startseite: der höchstbewertete Guide als Feature plus
 * die neuesten Einträge — Gegenstück zum LoadoutShowcasePanel daneben.
 * Ohne öffentliche Guides bleibt ein Empty-State mit Schreib-Link.
 */
export function GuideShowcasePanel({
  showcase,
  language,
  viewerUserId,
}: {
  showcase: GuideShowcase;
  language: GuideLanguage;
  viewerUserId: string | null;
}) {
  const t = useTranslations("home.guides");
  const tCta = useTranslations("home.cta");

  return (
    <section
      aria-labelledby="home-guides-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="home-guides-heading" className="text-lg font-medium">
          {t("heading")}
        </h2>
        <GlowLink href="/guides" className="text-sm">
          {t("viewAll")}
        </GlowLink>
      </div>

      {showcase.feature ? (
        <div className="animate-reveal" style={{ animationDelay: "0ms" }}>
          <FeatureGuideTile
            guide={showcase.feature}
            language={language}
            viewerUserId={viewerUserId}
          />
        </div>
      ) : (
        <Panel className="flex flex-col gap-3 p-4">
          <p className="text-sm text-text-muted">{t("empty")}</p>
          <GlowLink href="/guides/new" className="text-sm">
            {tCta("write")}
          </GlowLink>
        </Panel>
      )}

      {showcase.newest.length > 0 && (
        <div
          className="animate-reveal flex flex-col gap-3"
          style={{ animationDelay: "40ms" }}
        >
          <h3 className="text-sm font-medium text-text-muted">
            {t("newestHeading")}
          </h3>
          {showcase.newest.map((guide) => (
            <GuideCard
              key={guide.id}
              guide={guide}
              language={language}
              viewerUserId={viewerUserId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
