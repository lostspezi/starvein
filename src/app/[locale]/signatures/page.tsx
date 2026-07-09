import { getTranslations, setRequestLocale } from "next-intl/server";
import { findAllOres } from "@/features/ores/ores.repository";
import { GroundSignatureExplainer } from "@/features/signature-profiles/GroundSignatureExplainer";
import {
  ShipSignatureTable,
  type ShipSignatureRow,
} from "@/features/signature-profiles/ShipSignatureTable";
import { findAllSignatureProfiles } from "@/features/signature-profiles/signature-profiles.repository";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

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
    findAllSignatureProfiles(db),
    findAllOres(db),
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
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <h2 className="text-lg font-medium">{t("shipTitle")}</h2>
      <p className="text-sm text-text-muted">{t("shipExplainer")}</p>
      <ShipSignatureTable profiles={shipRows} />

      <h2 className="mt-4 text-lg font-medium">{t("groundTitle")}</h2>
      <GroundSignatureExplainer minerals={groundMinerals} />
    </section>
  );
}
