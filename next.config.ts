import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // Schlankes Runtime-Image für Docker-Deployments (CLAUDE.md §13)
  output: "standalone",
  // Workspace-Paket wird als TS-Source konsumiert (kein Build-Step)
  transpilePackages: ["@starvein/shared"],
  async headers() {
    return [
      {
        // Security-Header für alle Routen (CLAUDE.md §2/§13, Härtung Juli 2026)
        source: "/:path*",
        headers: buildSecurityHeaders(process.env.NODE_ENV === "production"),
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
