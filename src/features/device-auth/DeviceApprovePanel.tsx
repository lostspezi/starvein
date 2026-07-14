"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/lib/components/ui/Button";
import { Panel } from "@/lib/components/ui/Panel";

type PanelState = "idle" | "busy" | "approved" | "denied" | "error";

/**
 * Bestätigt (oder verweigert) einen Device-Flow-Code der Desktop-App.
 * Läuft nur mit bestehender Discord-Session — die Seite gate-t das
 * serverseitig; der Approve-Endpunkt erzwingt es zusätzlich.
 */
export function DeviceApprovePanel({
  initialUserCode,
}: {
  initialUserCode: string;
}) {
  const t = useTranslations("deviceAuth");
  const [userCode, setUserCode] = useState(initialUserCode);
  const [state, setState] = useState<PanelState>("idle");

  const trimmedCode = userCode.trim();

  async function submit(action: "approve" | "deny") {
    setState("busy");

    // Claim-Schritt (GET /device): bindet den Code an die laufende Session —
    // ohne ihn lehnt Better Auth approve/deny mit DEVICE_CODE_NOT_CLAIMED ab.
    const claim = await authClient.device({
      query: { user_code: trimmedCode },
    });
    if (claim.error) {
      setState("error");
      return;
    }

    const { error } =
      action === "approve"
        ? await authClient.device.approve({ userCode: trimmedCode })
        : await authClient.device.deny({ userCode: trimmedCode });

    if (error) {
      setState("error");
      return;
    }
    setState(action === "approve" ? "approved" : "denied");
  }

  if (state === "approved") {
    return (
      <Panel variant="glass" className="max-w-xl p-6">
        <p className="text-success">{t("approvedMessage")}</p>
      </Panel>
    );
  }

  if (state === "denied") {
    return (
      <Panel variant="glass" className="max-w-xl p-6">
        <p className="text-text-muted">{t("deniedMessage")}</p>
      </Panel>
    );
  }

  return (
    <Panel variant="glass" className="max-w-xl p-6">
      <p className="text-text-muted mb-4 text-sm">{t("intro")}</p>
      <label className="text-text-muted block text-sm" htmlFor="device-code">
        {t("codeLabel")}
      </label>
      <input
        id="device-code"
        value={userCode}
        onChange={(event) => setUserCode(event.target.value.toUpperCase())}
        autoComplete="off"
        spellCheck={false}
        className="border-glass-border bg-bg-nebula text-text-primary mt-1 mb-4 block w-48 rounded border px-3 py-2 font-mono text-lg tracking-widest"
      />
      {state === "error" && (
        <p className="text-warning mb-4 text-sm" role="alert">
          {t("errorMessage")}
        </p>
      )}
      <div className="flex gap-3">
        <Button
          disabled={trimmedCode.length === 0 || state === "busy"}
          onClick={() => submit("approve")}
        >
          {t("approve")}
        </Button>
        <Button
          variant="ghost"
          disabled={trimmedCode.length === 0 || state === "busy"}
          onClick={() => submit("deny")}
        >
          {t("deny")}
        </Button>
      </div>
    </Panel>
  );
}
