import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { OG_SIZE } from "@/lib/og/OgCard";
import { buildGuideOgImage, resolveOgLocale } from "@/lib/og/og-image";

// ISR: OG-Bild pro Guide on-demand gerendert und 1h gecacht. Ohne diese Zeile
// würde der DB-Zugriff das Bild bei jedem Aufruf neu rendern (teurer
// Satori-Render → DoS-Fläche über wechselnde IDs).
export const revalidate = 3600;

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Community guide on STARVEIN";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const image = await buildGuideOgImage(await getDb(), {
    locale: resolveOgLocale(locale),
    id,
  });
  if (!image) notFound();
  return image;
}
