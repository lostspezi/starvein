import { useTranslations } from "next-intl";

/** Kompakter Hero über dem Explorer. */
export function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="flex flex-col gap-1 py-2 text-center sm:py-4">
      <h1 className="text-2xl font-semibold tracking-widest text-accent-glow sm:text-3xl">
        {t("title")}
      </h1>
      <p className="text-sm text-text-muted">{t("tagline")}</p>
    </div>
  );
}
