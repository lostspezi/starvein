import { describe, expect, it, vi, beforeEach } from "vitest";

const getSessionUserId = vi.fn();
const isDashboardAdminUser = vi.fn();

vi.mock("@/lib/session", () => ({
  getSessionUserId: (...args: unknown[]) => getSessionUserId(...args),
}));
vi.mock("@/lib/db", () => ({ getDb: async () => ({}) }));
vi.mock("@/features/admin-dashboard/admin-access.service", () => ({
  isDashboardAdminUser: (...args: unknown[]) => isDashboardAdminUser(...args),
}));
// Rate-Limit ohne Redis: fail-open (null → weiter).
vi.mock("@/lib/read-rate-limit", () => ({
  enforceReadRateLimit: async () => null,
}));

import { GET } from "./route";

function req(): Request {
  return new Request("http://localhost/api/admin/dashboard/access");
}

describe("GET /api/admin/dashboard/access", () => {
  beforeEach(() => {
    getSessionUserId.mockReset();
    isDashboardAdminUser.mockReset();
  });

  it("returns 401 for anonymous requests", async () => {
    getSessionUserId.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(isDashboardAdminUser).not.toHaveBeenCalled();
  });

  it("returns allowed:false for a logged-in non-admin", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    isDashboardAdminUser.mockResolvedValue(false);
    const res = await GET(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ allowed: false });
  });

  it("returns allowed:true for a dashboard admin", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    isDashboardAdminUser.mockResolvedValue(true);
    const res = await GET(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ allowed: true });
  });
});
