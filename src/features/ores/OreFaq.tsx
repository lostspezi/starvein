import { JsonLd } from "@/lib/components/JsonLd";
import { Panel } from "@/lib/components/ui/Panel";
import { faqPageJsonLd } from "@/lib/structured-data";

export type FaqItem = { question: string; answer: string };

/**
 * Sichtbarer FAQ-Block plus FAQPage-JSON-LD. Der sichtbare Inhalt ist Pflicht,
 * nicht Deko: Google akzeptiert FAQ-Rich-Results nur, wenn dieselben Q&A auch
 * für Nutzer auf der Seite stehen. Rein präsentational — die Strings werden
 * server-seitig (lokalisiert, datengetrieben) in der Erz-Detailseite gebaut.
 */
export function OreFaq({
  heading,
  items,
}: {
  heading: string;
  items: FaqItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="ore-faq-heading" className="flex flex-col gap-3">
      <JsonLd data={faqPageJsonLd(items)} />
      <h2 id="ore-faq-heading" className="text-lg font-medium">
        {heading}
      </h2>
      <Panel variant="glass" className="p-4">
        <dl className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.question}>
              <dt className="font-medium text-text-primary">{item.question}</dt>
              <dd className="mt-1 text-sm text-text-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </section>
  );
}
