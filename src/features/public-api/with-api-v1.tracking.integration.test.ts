import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createKey } from "@/features/api-keys/api-keys.service";
import { trackUsage } from "@/features/public-api/usage-tracking";
import { withApiV1 } from "@/features/public-api/with-api-v1";
import { closeMongo, getDb } from "@/lib/db";

vi.mock("@/features/public-api/usage-tracking", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  trackUsage: vi.fn().mockResolvedValue(undefined),
}));

const mockedTrack = vi.mocked(trackUsage);

describe("withApiV1 usage tracking", () => {
  let apiKey: string;
  let userId: string;

  beforeAll(async () => {
    userId = new ObjectId().toHexString();
    const created = await createKey(await getDb(), userId, "tracking-test");
    apiKey = created.key;
  });

  beforeEach(() => {
    mockedTrack.mockClear();
  });

  afterAll(async () => {
    await closeMongo();
  });

  function call(handlerStatus: number) {
    const handler = withApiV1("test-endpoint", async () =>
      NextResponse.json({ ok: true }, { status: handlerStatus }),
    );
    return handler(
      new Request("http://localhost/api/v1/test", {
        headers: { authorization: `Bearer ${apiKey}` },
      }),
    );
  }

  it("tracks successful requests with key, endpoint and status", async () => {
    await call(200);
    expect(mockedTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        endpoint: "test-endpoint",
        status: 200,
      }),
    );
  });

  it("tracks handler errors as 500", async () => {
    const boom = withApiV1("boom", async () => {
      throw new Error("kaputt");
    });
    await boom(
      new Request("http://localhost/api/v1/boom", {
        headers: { authorization: `Bearer ${apiKey}` },
      }),
    );
    expect(mockedTrack).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "boom", status: 500 }),
    );
  });

  it("does not track unauthenticated requests", async () => {
    const handler = withApiV1("test-endpoint", async () =>
      NextResponse.json({ ok: true }),
    );
    await handler(new Request("http://localhost/api/v1/test"));
    expect(mockedTrack).not.toHaveBeenCalled();
  });
});
