import { useTranslations } from "next-intl";
import { JsonLd } from "@/lib/components/JsonLd";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { Panel } from "@/lib/components/ui/Panel";
import { faqPageJsonLd } from "@/lib/structured-data";

/** Nutzen-Panels mit Deep-Link in den jeweils beworbenen Bereich. */
const SECTIONS = [
  { key: "companion", href: "/companion" },
  { key: "chatLinks", href: "/ores" },
  { key: "api", href: "/api-docs" },
  { key: "guides", href: "/guides" },
] as const;

const FAQ_KEYS = [
  "showOnStream",
  "antiCheat",
  "apiCost",
  "viewerAccount",
] as const;

/**
 * Landing-Inhalt "Für Streamer": vier Nutzen-Panels plus sichtbarer
 * FAQ-Block mit FAQPage-JSON-LD. Der sichtbare FAQ-Inhalt ist Pflicht,
 * nicht Deko — Google akzeptiert FAQ-Rich-Results nur, wenn dieselben
 * Q&A auch für Nutzer auf der Seite stehen.
 */
export function ForStreamersContent() {
  const t = useTranslations("forStreamers");
  const faqItems = FAQ_KEYS.map((key) => ({
    question: t(`faq.${key}.question`),
    answer: t(`faq.${key}.answer`),
  }));

  return (
    <div className="flex flex-col gap-10">
      <p className="max-w-2xl text-text-muted">{t("intro")}</p>

      <section className="grid gap-6 sm:grid-cols-2">
        {SECTIONS.map(({ key, href }) => (
          <Panel key={key} variant="glass" className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-medium text-text-primary">
              {t(`sections.${key}.title`)}
            </h2>
            <p className="flex-1 text-sm text-text-muted">
              {t(`sections.${key}.body`)}
            </p>
            <GlowLink href={href} className="text-sm">
              {t(`sections.${key}.cta`)}
            </GlowLink>
          </Panel>
        ))}
      </section>

      <section
        aria-labelledby="for-streamers-faq"
        className="flex flex-col gap-3"
      >
        <JsonLd data={faqPageJsonLd(faqItems)} />
        <h2
          id="for-streamers-faq"
          className="text-lg font-medium text-accent-ice"
        >
          {t("faqTitle")}
        </h2>
        <Panel variant="glass" className="p-4">
          <dl className="flex flex-col gap-4">
            {faqItems.map((item) => (
              <div key={item.question}>
                <dt className="font-medium text-text-primary">
                  {item.question}
                </dt>
                <dd className="mt-1 text-sm text-text-muted">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </section>
    </div>
  );
}
