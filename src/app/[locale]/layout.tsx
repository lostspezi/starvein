import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ChatAside } from "@/features/chat/ChatAside";
import { routing } from "@/i18n/routing";
import { SiteFooter } from "@/lib/components/SiteFooter";
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

export const metadata: Metadata = {
  title: "STARVEIN",
  description:
    "Community mining reference for Star Citizen — ores, locations, scan signatures.",
};

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

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NuqsAdapter>
          <NextIntlClientProvider>
            <Starfield />
            <DriftingShips />
            <StarfieldRouteListener />
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
            <SiteFooter />
            <ChatAside />
          </NextIntlClientProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
