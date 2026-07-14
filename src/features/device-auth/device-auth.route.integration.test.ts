import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/auth/[...all]/route";

const CLIENT_ID = "starvein-companion";

function deviceRequest(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost:3000/api/auth${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * RFC-8628-Device-Flow für die Desktop-App (Slice D1): die Endpunkte kommen
 * aus dem Better-Auth-Plugin `deviceAuthorization` — diese Tests sichern die
 * Plugin-Verdrahtung (Client-Whitelist, Pending-Poll, Session-Pflicht) gegen
 * Upgrade-Regressionen ab.
 */
describe("device authorization flow", () => {
  it("issues device and user codes for the companion client", async () => {
    const response = await POST(
      deviceRequest("/device/code", { client_id: CLIENT_ID }),
    );
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.device_code).toEqual(expect.any(String));
    expect(json.user_code).toEqual(expect.any(String));
    expect(json.verification_uri).toContain("/device");
    expect(json.interval).toBeGreaterThan(0);
  });

  it("rejects unknown client ids", async () => {
    const response = await POST(
      deviceRequest("/device/code", { client_id: "evil-app" }),
    );
    expect(response.status).toBe(400);
  });

  it("reports authorization_pending while the user has not approved", async () => {
    const codeResponse = await POST(
      deviceRequest("/device/code", { client_id: CLIENT_ID }),
    );
    const { device_code } = await codeResponse.json();

    const tokenResponse = await POST(
      deviceRequest("/device/token", {
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code,
        client_id: CLIENT_ID,
      }),
    );
    expect(tokenResponse.status).toBe(400);
    const json = await tokenResponse.json();
    expect(json.error).toBe("authorization_pending");
  });

  it("verifies a user code via the claim endpoint", async () => {
    const codeResponse = await POST(
      deviceRequest("/device/code", { client_id: CLIENT_ID }),
    );
    const { user_code } = await codeResponse.json();

    const verifyResponse = await GET(
      new Request(
        `http://localhost:3000/api/auth/device?user_code=${user_code}`,
      ),
    );
    expect(verifyResponse.status).toBe(200);
    const json = await verifyResponse.json();
    expect(json.status).toBe("pending");
  });

  it("rejects unknown user codes on the claim endpoint", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/auth/device?user_code=NOPE1234"),
    );
    expect(response.status).toBe(400);
  });

  it("requires a session to approve a device", async () => {
    const response = await POST(
      deviceRequest("/device/approve", { userCode: "ABCD-EFGH" }),
    );
    expect(response.status).toBe(401);
  });
});
