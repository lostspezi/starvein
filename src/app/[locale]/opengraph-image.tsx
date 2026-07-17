import { OG_SIZE } from "@/lib/og/OgCard";
import { buildDefaultOgImage, resolveOgLocale } from "@/lib/og/og-image";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "STARVEIN — Star Citizen Mining Reference";

/** Site-weites Default-OG-Bild — greift für alle Routen ohne eigene Karte. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildDefaultOgImage(resolveOgLocale(locale));
}
