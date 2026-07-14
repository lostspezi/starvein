/**
 * RFC-8628-Device-Flow gegen das STARVEIN-Backend (Better-Auth-Plugin
 * `deviceAuthorization`, siehe Web-Slice src/features/device-auth).
 * fetch/sleep sind injizierbar: Produktion nutzt @tauri-apps/plugin-http,
 * Tests mocken beides.
 */

export const DEVICE_CLIENT_ID = "starvein-companion";

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export type DeviceCode = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresInSeconds: number;
  intervalSeconds: number;
};

export class DeviceFlowError extends Error {
  constructor(
    public readonly code: "denied" | "expired" | "protocol",
    message: string,
  ) {
    super(message);
    this.name = "DeviceFlowError";
  }
}

export async function requestDeviceCode({
  baseUrl,
  fetchFn,
}: {
  baseUrl: string;
  fetchFn: FetchFn;
}): Promise<DeviceCode> {
  const response = await fetchFn(`${baseUrl}/api/auth/device/code`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: DEVICE_CLIENT_ID }),
  });
  if (!response.ok) {
    throw new DeviceFlowError(
      "protocol",
      `device code request failed with ${response.status}`,
    );
  }

  const json = await response.json();
  return {
    deviceCode: json.device_code,
    userCode: json.user_code,
    verificationUri: json.verification_uri,
    verificationUriComplete:
      json.verification_uri_complete ??
      `${json.verification_uri}?user_code=${encodeURIComponent(json.user_code)}`,
    expiresInSeconds: json.expires_in,
    intervalSeconds: json.interval ?? 5,
  };
}

export async function pollForToken({
  baseUrl,
  deviceCode,
  intervalSeconds,
  fetchFn,
  sleep,
}: {
  baseUrl: string;
  deviceCode: string;
  intervalSeconds: number;
  fetchFn: FetchFn;
  sleep: (ms: number) => Promise<void>;
}): Promise<string> {
  let waitSeconds = intervalSeconds;

  for (;;) {
    const response = await fetchFn(`${baseUrl}/api/auth/device/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceCode,
        client_id: DEVICE_CLIENT_ID,
      }),
    });
    const json = await response.json();

    if (response.ok && json.access_token) {
      return json.access_token;
    }

    switch (json.error) {
      case "authorization_pending":
        break;
      case "slow_down":
        waitSeconds += 5;
        break;
      case "access_denied":
        throw new DeviceFlowError("denied", "user denied the device");
      case "expired_token":
        throw new DeviceFlowError("expired", "device code expired");
      default:
        throw new DeviceFlowError(
          "protocol",
          `unexpected token response: ${json.error ?? response.status}`,
        );
    }

    await sleep(waitSeconds * 1_000);
  }
}
