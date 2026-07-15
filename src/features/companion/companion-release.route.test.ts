import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanionRelease } from "./companion-release";

const fetchCompanionRelease = vi.fn<() => Promise<CompanionRelease | null>>();

vi.mock("./companion-release", () => ({
  fetchCompanionRelease: () => fetchCompanionRelease(),
}));

const RELEASE: CompanionRelease = {
  version: "0.1.1",
  setupExeUrl: "https://example.com/setup.exe",
  msiUrl: "https://example.com/installer.msi",
  latestJsonUrl: "https://example.com/latest.json",
};

beforeEach(() => {
  fetchCompanionRelease.mockReset();
});

describe("GET /api/companion/download", () => {
  it("redirects to the newest setup.exe", async () => {
    fetchCompanionRelease.mockResolvedValue(RELEASE);
    const { GET } = await import("@/app/api/companion/download/route");

    const response = await GET(
      new Request("http://localhost/api/companion/download"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://example.com/setup.exe",
    );
  });

  it("redirects to the MSI when requested", async () => {
    fetchCompanionRelease.mockResolvedValue(RELEASE);
    const { GET } = await import("@/app/api/companion/download/route");

    const response = await GET(
      new Request("http://localhost/api/companion/download?installer=msi"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://example.com/installer.msi",
    );
  });

  it("responds 503 when no release is resolvable", async () => {
    fetchCompanionRelease.mockResolvedValue(null);
    const { GET } = await import("@/app/api/companion/download/route");

    const response = await GET(
      new Request("http://localhost/api/companion/download"),
    );

    expect(response.status).toBe(503);
  });
});

describe("GET /api/companion/latest.json", () => {
  it("redirects to the update manifest of the newest release", async () => {
    fetchCompanionRelease.mockResolvedValue(RELEASE);
    const { GET } = await import("@/app/api/companion/latest.json/route");

    const response = await GET();

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://example.com/latest.json",
    );
  });

  it("responds 404 when the release has no manifest", async () => {
    fetchCompanionRelease.mockResolvedValue({
      ...RELEASE,
      latestJsonUrl: null,
    });
    const { GET } = await import("@/app/api/companion/latest.json/route");

    const response = await GET();

    expect(response.status).toBe(404);
  });
});
