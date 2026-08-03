import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Kopiert das Scalar-Standalone-Bundle (self-contained, MIT) nach
 * public/vendor, damit die API-Doku-Seite es unter strikter CSP von
 * 'self' laden kann — kein CDN. Läuft vor dev/build (siehe package.json);
 * public/vendor ist gitignored, die Version pinnt der Lockfile.
 */
const source = join(
  process.cwd(),
  "node_modules/@scalar/api-reference/dist/browser/standalone.js",
);
const target = join(process.cwd(), "public/vendor/scalar/standalone.js");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`[vendor-scalar] ${target}`);
