import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { Panel } from "@/lib/components/ui/Panel";

/** Community-CTA: eigenes Loadout bauen oder einen Guide schreiben. */
export function CtaTile() {
  const t = useTranslations("home.cta");

  return (
    <Panel className="flex h-full flex-col gap-3 p-4">
      <h3 className="text-sm font-medium text-text-muted">{t("heading")}</h3>
      <p className="text-sm text-text-muted">{t("text")}</p>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        <Link href="/loadouts/new">
          <Button>{t("create")}</Button>
        </Link>
        <GlowLink href="/guides/new" className="text-sm">
          {t("write")}
        </GlowLink>
      </div>
    </Panel>
  );
}
