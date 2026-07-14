import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Schlankes Runtime-Image für Docker-Deployments (CLAUDE.md §13)
  output: "standalone",
  // Workspace-Paket wird als TS-Source konsumiert (kein Build-Step)
  transpilePackages: ["@starvein/shared"],
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
