import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ChatAside } from "@/features/chat/ChatAside";
import { PriceTicker } from "@/features/price-ticker/PriceTicker";
import { routing } from "@/i18n/routing";
import { SiteFooter } from "@/lib/components/SiteFooter";
import { JsonLd } from "@/lib/components/JsonLd";
import { websiteJsonLd } from "@/lib/structured-data";
import {
  defaultOgImage,
  localeAlternates,
  OG_LOCALES,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import { Header } from "@/lib/components/Header";
import { DriftingShips } from "@/lib/components/starfield/DriftingShips";
import { Starfield } from "@/lib/components/starfield/Starfield";
import { StarfieldRouteListener } from "@/lib/components/starfield/StarfieldRouteListener";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0a0e1a",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("defaultTitle"),
      template: `%s · ${SITE_NAME}`,
    },
    description: t("description"),
    applicationName: SITE_NAME,
    alternates: localeAlternates(locale),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: t("defaultTitle"),
      description: t("description"),
      url: `${SITE_URL}/${locale}`,
      locale: OG_LOCALES[locale],
      alternateLocale: Object.entries(OG_LOCALES)
        .filter(([l]) => l !== locale)
        .map(([, og]) => og),
      images: defaultOgImage(locale),
    },
    twitter: {
      card: "summary_large_image",
      title: t("defaultTitle"),
      description: t("description"),
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const tMeta = await getTranslations({ locale, namespace: "meta" });

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={websiteJsonLd(tMeta("description"))} />
        <NuqsAdapter>
          <NextIntlClientProvider>
            <Starfield />
            <DriftingShips />
            <StarfieldRouteListener />
            <Header />
            <PriceTicker />
            <div className="flex flex-1 flex-col">{children}</div>
            <SiteFooter />
            <ChatAside />
          </NextIntlClientProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
