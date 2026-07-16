import { Gem, Hammer, MapPin, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnimatedNumber } from "@/lib/components/ui/AnimatedNumber";
import { Panel } from "@/lib/components/ui/Panel";

/** Stats-Panel mit den Kernzahlen der Datenbank (blau = Messwerte). */
export function StatsTile({
  oreCount,
  locationCount,
  blueprintCount,
  communityCount,
}: {
  oreCount: number;
  locationCount: number;
  blueprintCount: number;
  /** Öffentliche Loadouts + Guides zusammen. */
  communityCount: number;
}) {
  const t = useTranslations("home.stats");

  return (
    <Panel className="flex h-full flex-col gap-3 p-4">
      <h3 className="text-sm font-medium text-text-muted">{t("heading")}</h3>
      {/* Vier Werte: auf schmalen Viewports 2×2 statt einer gequetschten Reihe. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        <Stat icon={Gem} label={t("ores")} value={oreCount} />
        <Stat icon={MapPin} label={t("locations")} value={locationCount} />
        <Stat icon={Hammer} label={t("blueprints")} value={blueprintCount} />
        <Stat icon={Users} label={t("community")} value={communityCount} />
      </div>
    </Panel>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-text-muted">
        <Icon aria-hidden="true" className="size-4" />
        <AnimatedNumber
          value={value}
          className="font-mono text-xl text-accent-secondary"
        />
      </span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}
