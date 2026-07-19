import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { OG_SIZE } from "@/lib/og/OgCard";
import { buildBodyOgImage, resolveOgLocale } from "@/lib/og/og-image";

// ISR wie die zugehörige Seite: OG-Bild pro Slug on-demand gerendert und 1h
// gecacht. Ohne diese Zeile würde der DB-Zugriff das Bild bei jedem Aufruf neu
// rendern (teurer Satori-Render → DoS-Fläche über wechselnde Slugs).
export const revalidate = 3600;

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Mining location details on STARVEIN";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; system: string; body: string }>;
}) {
  const { locale, system, body } = await params;
  const image = await buildBodyOgImage(await getDb(), {
    locale: resolveOgLocale(locale),
    system,
    body,
  });
  if (!image) notFound();
  return image;
}
