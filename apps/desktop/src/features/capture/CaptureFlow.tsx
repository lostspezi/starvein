import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import type { Ore } from "@starvein/shared/ores";
import type {
  RefineryMethod,
  RefineryTerminal,
} from "@starvein/shared/refinery-catalog";
import {
  fetchOres,
  fetchRefineryMethods,
  fetchRefineryTerminals,
} from "../../lib/api";
import type { OcrCapture } from "../../lib/tauri";
import { CaptureConfirmForm } from "./CaptureConfirmForm";

type Catalogs = {
  ores: Ore[];
  terminals: RefineryTerminal[];
  methods: RefineryMethod[];
};

/** Lädt die Kataloge (Erze/Terminals/Methoden) und zeigt dann das Formular. */
export function CaptureFlow({
  token,
  capture,
  onCreated,
  onCancel,
}: {
  token: string;
  capture: OcrCapture;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("capture");
  const [catalogs, setCatalogs] = useState<Catalogs | "loading" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [ores, terminals, methods] = await Promise.all([
          fetchOres(),
          fetchRefineryTerminals(),
          fetchRefineryMethods(),
        ]);
        if (!cancelled) {
          setCatalogs({ ores, terminals, methods });
        }
      } catch {
        if (!cancelled) {
          setCatalogs("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (catalogs === "loading") {
    return <p className="text-text-muted text-sm">{t("loadingCatalogs")}</p>;
  }
  if (catalogs === "error") {
    return (
      <p className="text-warning text-sm" role="alert">
        {t("catalogsFailed")}
      </p>
    );
  }

  return (
    <CaptureConfirmForm
      token={token}
      capture={capture}
      ores={catalogs.ores}
      terminals={catalogs.terminals}
      methods={catalogs.methods}
      onCreated={onCreated}
      onCancel={onCancel}
    />
  );
}
