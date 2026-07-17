import { getTranslations } from "next-intl/server";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { PageShell } from "@/lib/components/ui/PageShell";
import { Panel } from "@/lib/components/ui/Panel";

/**
 * Lokalisierte 404 im Locale-Layout (Header/Footer/Disclaimer inklusive).
 * Hinweis: not-found.tsx kann kein generateMetadata exportieren — der
 * Default-Titel des Layouts greift, der 404-Status kommt von Next.
 */
export default async function NotFound() {
  const t = await getTranslations("common.notFound");

  return (
    <PageShell>
      <Panel className="flex flex-col items-start gap-3 p-6">
        <p className="font-mono text-sm tracking-widest text-accent-cyan">
          404
        </p>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted">{t("text")}</p>
        <GlowLink href="/">{t("backHome")}</GlowLink>
      </Panel>
    </PageShell>
  );
}
