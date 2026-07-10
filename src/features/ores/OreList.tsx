import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RARITY_TEXT_CLASS } from "@/lib/rarity";
import { MINING_METHODS, type Ore } from "./ores.schema";

export function OreList({ ores }: { ores: Ore[] }) {
  const t = useTranslations("ores");

  if (ores.length === 0) {
    return <p className="py-8 text-center text-text-muted">{t("empty")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-bg-nebula-2 bg-bg-nebula">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-bg-nebula-2 text-text-muted">
            <th className="px-4 py-3 font-medium">{t("table.name")}</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">
              {t("table.code")}
            </th>
            <th className="px-4 py-3 font-medium">{t("table.rarity")}</th>
            <th className="px-4 py-3 font-medium">{t("table.methods")}</th>
          </tr>
        </thead>
        <tbody>
          {ores.map((ore) => (
            <tr
              key={ore.code}
              id={ore.code}
              className="scroll-mt-40 border-b border-bg-nebula-2 last:border-b-0 hover:bg-bg-nebula-2 sm:scroll-mt-24"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/ores/${ore.code.toLowerCase()}`}
                  className="text-accent-primary hover:text-accent-glow hover:underline"
                >
                  {ore.name_en}
                </Link>
              </td>
              <td className="hidden px-4 py-3 font-mono text-text-muted sm:table-cell">
                {ore.code}
              </td>
              <td
                className={`px-4 py-3 font-medium ${RARITY_TEXT_CLASS[ore.rarityTier]}`}
              >
                {t(`rarity.${ore.rarityTier}`)}
              </td>
              <td className="px-4 py-3 text-text-muted">
                {MINING_METHODS.filter((method) => ore.mineableBy[method])
                  .map((method) => t(`method.${method}`))
                  .join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
