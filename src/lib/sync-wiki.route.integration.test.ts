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
import { runFullWikiSync } from "@/lib/run-wiki-sync";
import { closeMongo } from "@/lib/db";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Der echte Voll-Sync läuft gegen die geteilte Default-DB und würde dort
// Daten anderer Test-Dateien wegprunen — er ist über
// run-wiki-sync.integration.test.ts abgedeckt. Hier zählt nur die Route:
// Auth (fail closed) und Cache-Invalidierung nach Erfolg.
vi.mock("@/lib/run-wiki-sync", () => ({
  runFullWikiSync: vi.fn(async () => ({
    locations: { bodies: 7 },
    miningData: { ores: 4, occurrences: 7 },
    blueprints: { blueprints: 2 },
  })),
}));

function request(secret?: string): Request {
  return new Request("http://localhost/api/sync-wiki", {
    method: "POST",
    headers: secret ? { "x-sync-secret": secret } : {},
  });
}

describe("POST /api/sync-wiki", () => {
  beforeAll(() => {
    process.env.SYNC_SECRET = "test-secret";
  });

  afterEach(() => {
    vi.mocked(revalidateTag).mockClear();
    vi.mocked(runFullWikiSync).mockClear();
  });

  afterAll(async () => {
    delete process.env.SYNC_SECRET;
    await closeMongo();
  });

  it("rejects requests without the sync secret", async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(runFullWikiSync).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("runs the sync and invalidates the wiki data cache", async () => {
    const response = await POST(request("test-secret"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.miningData.ores).toBe(4);

    expect(runFullWikiSync).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("wiki-data", "max");
  });
});
