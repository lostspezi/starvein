import type { Db } from "mongodb";
import { createTranslator } from "next-intl";
import { ImageResponse } from "next/og";
import { getGuideForViewer } from "@/features/guides/guides.service";
import { pickGuideTranslation } from "@/features/guides/guides.schema";
import { MINING_METHODS } from "@/features/ores/ores.schema";
import { loadMessages, type AppLocale } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { loadOgFonts } from "./fonts";
import {
  OG_SIZE,
  OgCard,
  RARITY_COLORS,
  type OgCardProps,
  type OgChip,
} from "./OgCard";
import { loadBodyCardData, loadOreCardData } from "./og-data";

/** Locale-Param der Route auf eine unterstützte App-Locale abbilden. */
export function resolveOgLocale(value: string): AppLocale {
  return (routing.locales as readonly string[]).includes(value)
    ? (value as AppLocale)
    : (routing.defaultLocale as AppLocale);
}

function translator(locale: AppLocale) {
  return createTranslator({ locale, messages: loadMessages(locale) });
}

async function renderCard(props: OgCardProps): Promise<Response> {
  const fonts = await loadOgFonts();
  return new ImageResponse(<OgCard {...props} />, {
    ...OG_SIZE,
    fonts: [
      { name: "Inter", data: fonts.inter, weight: 600, style: "normal" },
      {
        name: "JetBrains Mono",
        data: fonts.mono,
        weight: 700,
        style: "normal",
      },
    ],
  });
}

/** Site-weites Default-Preview (Fallback für alle Routen ohne eigene Karte). */
export async function buildDefaultOgImage(
  locale: AppLocale,
): Promise<Response> {
  const t = translator(locale);
  return renderCard({
    title: "STARVEIN",
    eyebrow: t("og.kicker"),
    subtitle: t("meta.description"),
    showWordmark: false,
  });
}

export async function buildOreOgImage(
  db: Db,
  opts: { locale: AppLocale; code: string },
): Promise<Response | null> {
  const data = await loadOreCardData(db, opts.code);
  if (!data) return null;

  const t = translator(opts.locale);
  const { ore, locationCount, best } = data;
  const methods = MINING_METHODS.filter((m) => ore.mineableBy[m])
    .map((m) => t(`ores.method.${m}`))
    .join(" · ");

  const chips: OgChip[] = [
    { label: ore.code, color: RARITY_COLORS[ore.rarityTier] },
    { label: t("og.locations", { count: locationCount }) },
  ];
  if (best) {
    chips.push({
      label: t("og.bestChance", {
        probability: Math.round(best.probabilityPercent),
        body: best.bodyName,
      }),
    });
  }

  return renderCard({
    kicker: t("og.kicker"),
    eyebrow: `${t(`ores.rarity.${ore.rarityTier}`)} · ${methods}`,
    title: ore.name_en,
    chips,
  });
}

export async function buildBodyOgImage(
  db: Db,
  opts: { locale: AppLocale; system: string; body: string },
): Promise<Response | null> {
  const data = await loadBodyCardData(db, opts.system, opts.body);
  if (!data) return null;

  const t = translator(opts.locale);
  const { body, systemName, oreCount } = data;
  const chips: OgChip[] =
    oreCount > 0 ? [{ label: t("og.ores", { count: oreCount }) }] : [];

  return renderCard({
    kicker: t("og.kicker"),
    eyebrow: `${t(`locations.bodyType.${body.type}`)} · ${systemName}`,
    title: body.name,
    chips,
  });
}

export async function buildGuideOgImage(
  db: Db,
  opts: { locale: AppLocale; id: string },
): Promise<Response | null> {
  const guide = await getGuideForViewer(db, opts.id, null);
  if (!guide) return null;

  const t = translator(opts.locale);
  const translation = pickGuideTranslation(guide, opts.locale);

  return renderCard({
    kicker: t("og.kicker"),
    eyebrow: t("og.guide"),
    title: translation.title,
    subtitle: translation.description,
    chips: guide.tags.slice(0, 3).map((tag) => ({ label: tag })),
  });
}
