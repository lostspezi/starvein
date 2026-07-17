import { getTranslations, setRequestLocale } from "next-intl/server";
import { findAllOresCached } from "@/features/ores/ores.repository";
import { GroundSignatureExplainer } from "@/features/signature-profiles/GroundSignatureExplainer";
import {
  ShipSignatureTable,
  type ShipSignatureRow,
} from "@/features/signature-profiles/ShipSignatureTable";
import { findAllSignatureProfilesCached } from "@/features/signature-profiles/signature-profiles.repository";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: "/signatures",
    title: t("signatures.title"),
    description: t("signatures.description"),
  });
}

export default async function SignaturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const db = await getDb();
  const t = await getTranslations("signatures");

  const [profiles, ores] = await Promise.all([
    findAllSignatureProfilesCached(db),
    findAllOresCached(db),
  ]);
  const oresByCode = new Map(ores.map((ore) => [ore.code, ore]));

  const shipRows: ShipSignatureRow[] = profiles
    .filter((profile) => profile.method === "ship")
    .map((profile) => {
      const ore = oresByCode.get(profile.oreCode);
      return {
        ...profile,
        oreName: ore?.name_en ?? profile.oreCode,
        rarityTier: ore?.rarityTier ?? "common",
      };
    });

  const groundMinerals = [
    ...new Set(
      profiles
        .filter((profile) => profile.method !== "ship")
        .map((profile) => profile.oreCode),
    ),
  ]
    .map((code) => ({
      code,
      name: oresByCode.get(code)?.name_en ?? code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <PageShell>
      <PageHeader title={t("title")} />

      <h2 className="text-lg font-medium">{t("shipTitle")}</h2>
      <p className="text-sm text-text-muted">{t("shipExplainer")}</p>
      <ShipSignatureTable profiles={shipRows} />

      <h2 className="mt-4 text-lg font-medium">{t("groundTitle")}</h2>
      <GroundSignatureExplainer minerals={groundMinerals} />
    </PageShell>
  );
}
