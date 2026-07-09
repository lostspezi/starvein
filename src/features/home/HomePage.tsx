import { useTranslations } from "next-intl";

export function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-4xl font-semibold tracking-widest text-accent-glow">
        {t("title")}
      </h1>
      <p className="max-w-xl text-text-muted">{t("tagline")}</p>
    </main>
  );
}
