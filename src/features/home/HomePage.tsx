import { useTranslations } from "next-intl";
import { SearchBox } from "@/features/search/SearchBox";

/**
 * Hero der Startseite: großer Titel mit Cyan-Glow, Tagline und prominente
 * Suche — bewusst ohne Panel, damit das Starfield durchscheint. Die Suche
 * trägt ein eigenes Label, damit sie neben der Header-Suche eindeutig bleibt.
 */
export function HomePage() {
  const t = useTranslations("home");

  return (
    <section className="flex flex-col items-center gap-4 py-8 text-center sm:py-14">
      <h1 className="animate-reveal font-mono text-4xl font-semibold tracking-widest text-accent-ice [text-shadow:0_0_28px_rgb(94_230_255_/_0.35)] sm:text-5xl">
        {t("title")}
      </h1>
      <p
        className="animate-reveal max-w-xl text-sm text-text-muted sm:text-base"
        style={{ animationDelay: "60ms" }}
      >
        {t("tagline")}
      </p>
      <div
        className="animate-reveal w-full max-w-xl"
        style={{ animationDelay: "120ms" }}
      >
        <SearchBox
          ariaLabel={t("searchLabel")}
          inputClassName="px-4 py-3 text-base focus:border-accent-cyan focus:shadow-glow-sm"
        />
      </div>
    </section>
  );
}
