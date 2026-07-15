import { z } from "zod";

/**
 * Auflösung des neuesten Desktop-Releases über die GitHub-API. Die
 * Companion-Releases sind Prereleases — GitHubs "releases/latest" zeigt
 * nur stabile Releases und funktioniert dafür nicht; deshalb wird die
 * Release-Liste gelesen (neueste zuerst) und der erste "desktop-v*"-Tag
 * mit Setup-Installer genommen. Die Antwort wird von Next.js 5 Minuten
 * gecacht (fetch revalidate), damit weder Seitenaufrufe noch der
 * Tauri-Updater das GitHub-Rate-Limit treffen.
 */

const RELEASES_API_URL =
  "https://api.github.com/repos/lostspezi/starvein/releases?per_page=10";
const TAG_PREFIX = "desktop-v";

const releasesSchema = z.array(
  z.object({
    tag_name: z.string(),
    assets: z.array(
      z.object({
        name: z.string(),
        browser_download_url: z.string(),
      }),
    ),
  }),
);

export type CompanionRelease = {
  version: string;
  setupExeUrl: string;
  msiUrl: string | null;
  latestJsonUrl: string | null;
};

export async function fetchCompanionRelease(): Promise<CompanionRelease | null> {
  try {
    const response = await fetch(RELEASES_API_URL, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      return null;
    }
    const releases = releasesSchema.parse(await response.json());
    for (const release of releases) {
      if (!release.tag_name.startsWith(TAG_PREFIX)) {
        continue;
      }
      const setup = release.assets.find((asset) =>
        asset.name.endsWith("-setup.exe"),
      );
      if (!setup) {
        continue;
      }
      return {
        version: release.tag_name.slice(TAG_PREFIX.length),
        setupExeUrl: setup.browser_download_url,
        msiUrl:
          release.assets.find((asset) => asset.name.endsWith(".msi"))
            ?.browser_download_url ?? null,
        latestJsonUrl:
          release.assets.find((asset) => asset.name === "latest.json")
            ?.browser_download_url ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}
