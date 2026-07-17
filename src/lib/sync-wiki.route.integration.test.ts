import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { revalidateTag } from "next/cache";
import { POST } from "@/app/api/sync-wiki/route";
import { upsertStarSystems } from "@/features/locations/locations.repository";
import { closeMongo, getDb } from "@/lib/db";
import { SCWIKI_TEST_BASE_URL, scWikiServer } from "@/test/scwiki-server";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

function request(secret?: string): Request {
  return new Request("http://localhost/api/sync-wiki", {
    method: "POST",
    headers: secret ? { "x-sync-secret": secret } : {},
  });
}

describe("POST /api/sync-wiki", () => {
  beforeAll(async () => {
    scWikiServer.listen({ onUnhandledRequest: "error" });
    process.env.SCWIKI_API_BASE_URL = SCWIKI_TEST_BASE_URL;
    process.env.SYNC_SECRET = "test-secret";
    await upsertStarSystems(await getDb(), [
      { code: "STANTON", name: "Stanton", status: "live", uexId: 68 },
    ]);
  });

  afterEach(() => {
    scWikiServer.resetHandlers();
    vi.mocked(revalidateTag).mockClear();
  });

  afterAll(async () => {
    scWikiServer.close();
    delete process.env.SCWIKI_API_BASE_URL;
    delete process.env.SYNC_SECRET;
    await closeMongo();
  });

  it("rejects requests without the sync secret", async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it(
    "runs the sync and invalidates the wiki data cache",
    { timeout: 30_000 },
    async () => {
      const response = await POST(request("test-secret"));
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.miningData.ores).toBeGreaterThan(0);

      expect(revalidateTag).toHaveBeenCalledWith("wiki-data", "max");
    },
  );
});
