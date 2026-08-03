import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SITE_URL } from "@/lib/site-config";

const CURL_EXAMPLE = `curl -H "Authorization: Bearer sv_..." \\
  ${SITE_URL}/api/v1/ores`;

/** Handgeschriebener Schnellstart über der interaktiven Scalar-Referenz. */
export function ApiQuickstart() {
  const t = useTranslations("publicApi");

  return (
    <div className="space-y-6">
      <p className="max-w-prose text-text-muted">{t("intro")}</p>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-accent-ice">
          {t("quickstart.title")}
        </h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>{t("quickstart.step1")}</li>
          <li>{t("quickstart.step2")}</li>
          <li>{t("quickstart.step3")}</li>
        </ol>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-glass-border bg-bg-nebula p-4 font-mono text-sm text-accent-secondary">
          {CURL_EXAMPLE}
        </pre>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-accent-ice">
            {t("limits.title")}
          </h2>
          <p className="max-w-prose text-text-muted">{t("limits.text")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-accent-ice">
            {t("envelope.title")}
          </h2>
          <p className="max-w-prose text-text-muted">{t("envelope.text")}</p>
        </section>
      </div>

      <p>
        <Link
          href="/account/api-keys"
          className="text-accent-primary transition-colors duration-150 hover:text-accent-glow"
        >
          {t("manageKeys")} →
        </Link>
      </p>
    </div>
  );
}
