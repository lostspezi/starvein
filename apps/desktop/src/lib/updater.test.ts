import { beforeEach, describe, expect, it, vi } from "vitest";

const check = vi.fn();
const relaunch = vi.fn().mockResolvedValue(undefined);

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: (...args: unknown[]) => check(...args),
}));
vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: (...args: unknown[]) => relaunch(...args),
}));

import { checkForUpdate } from "./updater";

beforeEach(() => {
  check.mockReset();
  relaunch.mockClear();
});

describe("checkForUpdate", () => {
  it("returns null when the app is up to date", async () => {
    check.mockResolvedValue(null);

    expect(await checkForUpdate()).toBeNull();
  });

  it("maps an available update and installs via download + relaunch", async () => {
    const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
    check.mockResolvedValue({ version: "0.3.0", downloadAndInstall });

    const update = await checkForUpdate();

    expect(update?.version).toBe("0.3.0");
    await update?.install();
    expect(downloadAndInstall).toHaveBeenCalled();
    expect(relaunch).toHaveBeenCalled();
  });

  it("does not relaunch when the download fails", async () => {
    const downloadAndInstall = vi.fn().mockRejectedValue(new Error("offline"));
    check.mockResolvedValue({ version: "0.3.0", downloadAndInstall });

    const update = await checkForUpdate();

    await expect(update?.install()).rejects.toThrow();
    expect(relaunch).not.toHaveBeenCalled();
  });
});
