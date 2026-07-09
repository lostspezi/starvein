import { NextResponse } from "next/server";
import { checkHealth } from "@/features/health/service";

export const dynamic = "force-dynamic";

/**
 * Antwortet bewusst immer mit 200 und Per-Service-Status, damit die App
 * ohne laufende Infrastruktur nutzbar bleibt (lokale Entwicklung ohne
 * Docker). Eine strict-Variante (503 bei degraded) kann ergänzt werden,
 * sobald echtes Monitoring existiert.
 */
export async function GET() {
  return NextResponse.json(await checkHealth());
}
