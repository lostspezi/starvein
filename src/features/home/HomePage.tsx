import { useTranslations } from "next-intl";
import { SearchBox } from "@/features/search/SearchBox";

/**
 * Hero der Startseite: Wortmarke mit Cyan-Glow, menschlicher Willkommenstext
 * und prominente Suche — linksbündig als Teil der Dashboard-Kopfzeile,
 * bewusst ohne Panel, damit das Starfield durchscheint. Die Suche trägt ein
 * eigenes Label, damit sie neben der Header-Suche eindeutig bleibt.
 */
export function HomePage() {
  const t = useTranslations("home");

  return (
    <section className="flex flex-col justify-center gap-4 py-4 sm:py-6">
      <h1 className="animate-reveal">
        <span className="block font-mono text-3xl font-semibold tracking-widest text-accent-ice [text-shadow:0_0_28px_rgb(94_230_255_/_0.35)] sm:text-4xl">
          {t("title")}
        </span>{" "}
        <span className="mt-1 block text-sm font-normal tracking-wide text-text-muted sm:text-base">
          {t("tagline")}
        </span>
      </h1>
      <p
        className="animate-reveal max-w-xl text-sm text-text-muted sm:text-base"
        style={{ animationDelay: "60ms" }}
      >
        {t("welcome")}
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
