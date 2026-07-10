import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // 12 Worker sättigen den einen next-start-Prozess und provozieren
  // Klick-vor-Hydration-Races in den URL-State-Tests — 8 ist stabil.
  workers: 8,
  use: {
    baseURL: "http://localhost:3100",
    // Headless-Chromium rendert WebGL per Software (SwiftShader) — der
    // Starfield-Render-Loop würde mit parallelen Workern den Main-Thread
    // sättigen und Klick-/Hydration-Races verursachen. Mit emuliertem
    // reduced-motion nimmt die App deterministisch den statischen Fallback.
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm run e2e:server",
    url: "http://localhost:3100/en",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
