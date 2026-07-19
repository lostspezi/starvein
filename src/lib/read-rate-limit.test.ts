import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, enforceReadRateLimit } from "@/lib/read-rate-limit";
import { checkRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

const mockedCheck = vi.mocked(checkRateLimit);

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/ores", { headers });
}

describe("clientIp", () => {
  it("prefers cf-connecting-ip", () => {
    expect(
      clientIp(
        new Headers({
          "cf-connecting-ip": "203.0.113.7",
          "x-forwarded-for": "10.0.0.1",
        }),
      ),
    ).toBe("203.0.113.7");
  });

  it("falls back to the first x-forwarded-for hop", () => {
    expect(
      clientIp(new Headers({ "x-forwarded-for": "198.51.100.9, 10.0.0.1" })),
    ).toBe("198.51.100.9");
  });

  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "192.0.2.5" }))).toBe(
      "192.0.2.5",
    );
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("enforceReadRateLimit", () => {
  afterEach(() => mockedCheck.mockReset());

  it("returns null when under the limit", async () => {
    mockedCheck.mockResolvedValue(true);
    const result = await enforceReadRateLimit(req(), "ores");
    expect(result).toBeNull();
  });

  it("returns a 429 when over the limit", async () => {
    mockedCheck.mockResolvedValue(false);
    const result = await enforceReadRateLimit(req(), "ores");
    expect(result?.status).toBe(429);
  });

  it("keys the limit by bucket and client IP", async () => {
    mockedCheck.mockResolvedValue(true);
    await enforceReadRateLimit(
      req({ "cf-connecting-ip": "203.0.113.7" }),
      "search",
      50,
      30,
    );
    expect(mockedCheck).toHaveBeenCalledWith("read:search:203.0.113.7", 50, 30);
  });
});
