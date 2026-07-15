import { NextResponse } from "next/server";
import { fetchCompanionRelease } from "@/features/companion/companion-release";

export const dynamic = "force-dynamic";

/**
 * Update-Endpoint für den Tauri-Updater der Desktop-App: 302 auf das
 * latest.json-Manifest des neuesten desktop-v*-Release. Stabile URL,
 * die auch mit Prereleases funktioniert (GitHubs "releases/latest"
 * tut das nicht).
 */
export async function GET() {
  const release = await fetchCompanionRelease();
  if (!release || release.latestJsonUrl === null) {
    return NextResponse.json({ error: "no update manifest" }, { status: 404 });
  }
  return NextResponse.redirect(release.latestJsonUrl, 302);
}
