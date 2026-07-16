"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import type { Material } from "./materials.schema";

/**
 * Mengen-Editor für das Materialinventar. Setzt Mengen per PUT (idempotent);
 * Menge 0 löscht den Eintrag serverseitig.
 *
 * Die Schrittweite hängt an der Material-Art: "resource" wird in SCU geführt
 * (Bruchmengen erlaubt), "item" in Stück.
 */
export function MaterialInventoryEditor({
  materials,
  initialQuantities,
}: {
  materials: Material[];
  initialQuantities: Record<string, number>;
}) {
  const t = useTranslations("inventory");
  const tMaterials = useTranslations("materials");
  const [quantities, setQuantities] =
    useState<Record<string, number>>(initialQuantities);
  const [failed, setFailed] = useState<string | null>(null);

  if (materials.length === 0) {
    return <p className="py-8 text-center text-text-muted">{t("empty")}</p>;
  }

  async function save(materialCode: string, quantity: number) {
    setQuantities((prev) => ({ ...prev, [materialCode]: quantity }));
    const response = await fetch("/api/material-inventory", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ materialCode, quantity }),
    });
    setFailed(response.ok ? null : materialCode);
  }

  return (
    <div className="flex flex-col gap-2">
      {failed !== null && (
        <p role="alert" className="text-sm text-warning">
          {t("saveError")}
        </p>
      )}
      <DataTable>
        <DataTableHead>
          <DataTableTh>{t("table.material")}</DataTableTh>
          <DataTableTh className="hidden sm:table-cell">
            {t("table.kind")}
          </DataTableTh>
          <DataTableTh>{t("table.quantity")}</DataTableTh>
        </DataTableHead>
        <tbody>
          {materials.map((material) => {
            const isResource = material.kind === "resource";
            return (
              <DataTableRow key={material.code}>
                <DataTableTd>{material.name}</DataTableTd>
                <DataTableTd className="hidden text-text-muted sm:table-cell">
                  {tMaterials(`kind.${material.kind}`)}
                </DataTableTd>
                <DataTableTd>
                  <input
                    type="number"
                    min={0}
                    step={isResource ? 0.01 : 1}
                    inputMode="decimal"
                    aria-label={t("quantityLabel", { material: material.name })}
                    value={quantities[material.code] ?? 0}
                    onChange={(event) => {
                      const raw = Number(event.target.value) || 0;
                      const next = Math.max(
                        0,
                        isResource ? raw : Math.floor(raw),
                      );
                      void save(material.code, next);
                    }}
                    className="w-24 rounded border border-bg-nebula-2 bg-bg-void px-2 py-1 text-right font-mono text-sm transition-all duration-150 focus:border-accent-primary focus:outline-none"
                  />
                </DataTableTd>
              </DataTableRow>
            );
          })}
        </tbody>
      </DataTable>
    </div>
  );
}
