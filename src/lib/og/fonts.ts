import { readFile } from "node:fs/promises";
import path from "node:path";

export type OgFonts = { inter: Buffer; mono: Buffer };

let cached: Promise<OgFonts> | null = null;

/**
 * Lädt die OG-Card-Fonts (OFL, siehe CREDITS.md) einmalig pro Prozess.
 * Sie liegen bewusst in public/og-fonts: der Ordner wird ins Standalone-
 * Docker-Image kopiert und ist in Vitest direkt vom Repo-Root lesbar.
 */
export function loadOgFonts(): Promise<OgFonts> {
  cached ??= (async () => {
    const dir = path.join(process.cwd(), "public", "og-fonts");
    const [inter, mono] = await Promise.all([
      readFile(path.join(dir, "inter-600.woff")),
      readFile(path.join(dir, "jetbrains-mono-700.woff")),
    ]);
    return { inter, mono };
  })();
  return cached;
}
