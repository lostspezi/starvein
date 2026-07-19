import { NextResponse } from "next/server";
import { fetchCompanionRelease } from "@/features/companion/companion-release";

export const dynamic = "force-dynamic";

/**
 * Direkter Download des neuesten Companion-Installers ohne Umweg über die
 * GitHub-Release-Seite: 302 auf das Asset des neuesten desktop-v*-Release.
 * `?installer=msi` liefert die MSI-Variante, Default ist die NSIS-Setup-exe.
 */
export async function GET(request: Request) {
  const release = await fetchCompanionRelease();
  if (!release) {
    return NextResponse.json({ error: "release unavailable" }, { status: 503 });
  }
  // "msi" schaltet auf die MSI-Variante; jeder andere/fehlende Wert → Default
  // (setup.exe). Der Parameter wird ausschließlich verglichen und fließt nie in
  // die Ziel-URL (die stammt aus der GitHub-Release-API) — kein SSRF/Injection.
  const wantsMsi = new URL(request.url).searchParams.get("installer") === "msi";
  const target =
    wantsMsi && release.msiUrl !== null ? release.msiUrl : release.setupExeUrl;
  return NextResponse.redirect(target, 302);
}
