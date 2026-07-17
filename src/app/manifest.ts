import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STARVEIN — Star Citizen Mining Reference",
    short_name: "STARVEIN",
    description:
      "Community-maintained mining reference for Star Citizen: ores, locations, scan signatures, prices.",
    // Bewusst ohne Locale-Prefix: die Proxy-Middleware leitet beim PWA-Start
    // per Accept-Language auf /de bzw. /en um — kein Hardcoding einer Sprache.
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e1a",
    theme_color: "#0a0e1a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
