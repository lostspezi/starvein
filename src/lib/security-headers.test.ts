import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "@/lib/security-headers";

function headerMap(isProd: boolean): Record<string, string> {
  return Object.fromEntries(
    buildSecurityHeaders(isProd).map((h) => [h.key, h.value]),
  );
}

describe("buildSecurityHeaders", () => {
  it("always sets the baseline hardening headers", () => {
    const dev = headerMap(false);
    expect(dev["X-Content-Type-Options"]).toBe("nosniff");
    expect(dev["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(dev["X-Frame-Options"]).toBe("DENY");
    expect(dev["Permissions-Policy"]).toContain("geolocation=()");
  });

  it("omits CSP in development (HMR needs unsafe-eval)", () => {
    expect(headerMap(false)["Content-Security-Policy"]).toBeUndefined();
  });

  it("enforces CSP in production", () => {
    expect(headerMap(true)["Content-Security-Policy"]).toBeDefined();
  });
});

describe("buildContentSecurityPolicy", () => {
  const csp = buildContentSecurityPolicy();

  it("locks down the dangerous fetch directives", () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it("allows the origins the app actually needs", () => {
    // Discord-Avatare + YouTube-Guides dürfen nicht versehentlich geblockt werden
    expect(csp).toContain("https://cdn.discordapp.com");
    expect(csp).toContain("https://www.youtube.com");
  });
});
