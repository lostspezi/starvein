import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCompanionRelease } from "./companion-release";

function githubResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as Response;
}

const RELEASES = [
  {
    tag_name: "web-v2.0.0",
    assets: [],
  },
  {
    tag_name: "desktop-v0.1.1",
    assets: [
      {
        name: "STARVEIN.Companion_0.1.1_x64-setup.exe",
        browser_download_url:
          "https://github.com/lostspezi/starvein/releases/download/desktop-v0.1.1/STARVEIN.Companion_0.1.1_x64-setup.exe",
      },
      {
        name: "STARVEIN.Companion_0.1.1_x64_en-US.msi",
        browser_download_url:
          "https://github.com/lostspezi/starvein/releases/download/desktop-v0.1.1/STARVEIN.Companion_0.1.1_x64_en-US.msi",
      },
      {
        name: "latest.json",
        browser_download_url:
          "https://github.com/lostspezi/starvein/releases/download/desktop-v0.1.1/latest.json",
      },
    ],
  },
  {
    tag_name: "desktop-v0.1.0",
    assets: [
      {
        name: "STARVEIN.Companion_0.1.0_x64-setup.exe",
        browser_download_url:
          "https://github.com/lostspezi/starvein/releases/download/desktop-v0.1.0/STARVEIN.Companion_0.1.0_x64-setup.exe",
      },
    ],
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCompanionRelease", () => {
  it("resolves the newest desktop release with its installer assets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(githubResponse(RELEASES)));

    const release = await fetchCompanionRelease();

    expect(release).toEqual({
      version: "0.1.1",
      setupExeUrl:
        "https://github.com/lostspezi/starvein/releases/download/desktop-v0.1.1/STARVEIN.Companion_0.1.1_x64-setup.exe",
      msiUrl:
        "https://github.com/lostspezi/starvein/releases/download/desktop-v0.1.1/STARVEIN.Companion_0.1.1_x64_en-US.msi",
      latestJsonUrl:
        "https://github.com/lostspezi/starvein/releases/download/desktop-v0.1.1/latest.json",
    });
  });

  it("skips desktop releases without a setup installer", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          githubResponse([
            { tag_name: "desktop-v0.2.0", assets: [] },
            RELEASES[2],
          ]),
        ),
    );

    const release = await fetchCompanionRelease();

    expect(release?.version).toBe("0.1.0");
    expect(release?.msiUrl).toBeNull();
    expect(release?.latestJsonUrl).toBeNull();
  });

  it("returns null when GitHub responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(githubResponse({ message: "rate limit" }, false)),
    );

    expect(await fetchCompanionRelease()).toBeNull();
  });

  it("returns null when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    expect(await fetchCompanionRelease()).toBeNull();
  });
});
