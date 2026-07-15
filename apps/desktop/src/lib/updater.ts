import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

/**
 * Dünner Wrapper um den Tauri-Updater: check() fragt den in
 * tauri.conf.json konfigurierten Endpoint (starvein.app-Proxy auf das
 * latest.json des neuesten GitHub-Release) ab und verifiziert die
 * minisign-Signatur. install() lädt, installiert und startet die App neu.
 */
export type AvailableUpdate = {
  version: string;
  install: () => Promise<void>;
};

export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  const update = await check();
  if (!update) {
    return null;
  }
  return {
    version: update.version,
    install: async () => {
      await update.downloadAndInstall();
      await relaunch();
    },
  };
}
