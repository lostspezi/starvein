import { describe, expect, it, vi } from "vitest";
import { pollForToken, requestDeviceCode } from "./device-flow";

const BASE = "https://starvein.example";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("requestDeviceCode", () => {
  it("posts the client id and returns the code payload", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        device_code: "dev-123",
        user_code: "ABCD-EFGH",
        verification_uri: `${BASE}/device`,
        verification_uri_complete: `${BASE}/device?user_code=ABCD-EFGH`,
        expires_in: 1800,
        interval: 5,
      }),
    );

    const result = await requestDeviceCode({ baseUrl: BASE, fetchFn });

    expect(fetchFn).toHaveBeenCalledWith(
      `${BASE}/api/auth/device/code`,
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (fetchFn.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.client_id).toBe("starvein-companion");
    expect(result.deviceCode).toBe("dev-123");
    expect(result.userCode).toBe("ABCD-EFGH");
    expect(result.intervalSeconds).toBe(5);
    expect(result.verificationUriComplete).toContain("user_code=ABCD-EFGH");
  });

  it("throws when the server rejects the client", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: "invalid_request" }));

    await expect(
      requestDeviceCode({ baseUrl: BASE, fetchFn }),
    ).rejects.toThrow();
  });
});

describe("pollForToken", () => {
  it("keeps polling while authorization is pending, then resolves", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(400, { error: "authorization_pending" }),
      )
      .mockResolvedValueOnce(
        jsonResponse(400, { error: "authorization_pending" }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "tok-1" }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const token = await pollForToken({
      baseUrl: BASE,
      deviceCode: "dev-123",
      intervalSeconds: 5,
      fetchFn,
      sleep,
    });

    expect(token).toBe("tok-1");
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(5_000);
  });

  it("backs off when the server says slow_down", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(400, { error: "slow_down" }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "tok-2" }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await pollForToken({
      baseUrl: BASE,
      deviceCode: "dev-123",
      intervalSeconds: 5,
      fetchFn,
      sleep,
    });

    expect(sleep).toHaveBeenCalledWith(10_000);
  });

  it("fails with 'denied' when the user denies access", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: "access_denied" }));

    await expect(
      pollForToken({
        baseUrl: BASE,
        deviceCode: "dev-123",
        intervalSeconds: 5,
        fetchFn,
        sleep: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: "denied" });
  });

  it("fails with 'expired' when the code expires", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: "expired_token" }));

    await expect(
      pollForToken({
        baseUrl: BASE,
        deviceCode: "dev-123",
        intervalSeconds: 5,
        fetchFn,
        sleep: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: "expired" });
  });
});
