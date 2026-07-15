# STARVEIN Companion

Windows-Desktop-App (Tauri 2) neben Star Citizen: Discord-Login gegen das
STARVEIN-Backend, Hotkey-Screenshot + OCR des Refinery-Terminals und
automatische Anlage von Refinery-Jobs über `POST /api/refinery-jobs`.

> This is an unofficial Star Citizen fansite, not affiliated with the Cloud
> Imperium group of companies. All content on this site not authored by its
> host or users are property of their respective owners.

## Entwicklung

Voraussetzungen (zusätzlich zu Node 24 + pnpm des Hauptrepos):

- **Rust (stable)** über [rustup](https://rustup.rs/) — installiert auch die
  MSVC-Build-Tools-Abfrage; falls sie fehlen: Visual Studio Build Tools mit
  Workload "Desktopentwicklung mit C++".
- **WebView2-Runtime** — auf Windows 11 vorinstalliert.

```bash
pnpm install                                  # im Repo-Root (Workspace)
pnpm --filter @starvein/desktop tauri dev     # App mit HMR starten
pnpm --filter @starvein/desktop test          # Vitest (Komponenten/Units)
pnpm --filter @starvein/desktop typecheck
pnpm --filter @starvein/desktop tauri build   # NSIS-Installer bauen
```

Rust-Checks (in `src-tauri/`): `cargo fmt --check`, `cargo clippy`,
`cargo test`. Vorher einmal `pnpm --filter @starvein/desktop build`
ausführen — `tauri::generate_context!` braucht das `dist/`-Verzeichnis.

## Architektur-Notizen

- Geteilte Zod-Schemas/Design-Tokens kommen aus `@starvein/shared`
  (packages/shared) — kein Contract-Drift zur Web-App.
- API-Zugriff über `@tauri-apps/plugin-http` (Rust-reqwest, kein CORS) mit
  Bearer-Session-Token (Better-Auth-Device-Flow, ab Slice D1).
- Anti-Cheat-Grenze: ausschließlich OS-Level-Screenshots und Read-only-Zugriff
  auf `Game.log`. Niemals Speicher lesen, niemals in den Spielprozess
  injizieren.
- `src/components/AppFooter.test.tsx` ist der **permanente
  Branding-Compliance-Test** (CLAUDE.md §2) — nie löschen, skippen oder
  abschwächen.

## Auto-Update

Die App prüft beim Start (und über die Einstellungen) gegen
`https://starvein.app/api/companion/latest.json` — ein Proxy auf das
`latest.json` des neuesten `desktop-v*`-GitHub-Release. Updates sind
minisign-signiert (`plugins.updater.pubkey` in `tauri.conf.json`).

- Der Release-Workflow braucht die Repo-Secrets `TAURI_SIGNING_PRIVATE_KEY`
  und `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, sonst entstehen keine
  Updater-Artefakte (`.sig` + `latest.json`).
- Der private Schlüssel liegt NICHT im Repo (lokal:
  `%USERPROFILE%\.tauri\starvein-companion.key`) — Backup anlegen! Geht er
  verloren, können bestehende Installationen keine Updates mehr verifizieren.

## Hotkey-Technik: Low-Level-Hook statt RegisterHotKey

Star Citizen liest die Tastatur per Raw Input und unterdrückt damit die
Erzeugung klassischer Tastatur-Messages — `RegisterHotKey`-Hotkeys
(auch die des früheren `tauri-plugin-global-shortcut`) feuern deshalb
**nie**, solange das Spiel den Fokus hat (live nachgewiesen, 07/2026).
Der Companion nutzt daher einen `WH_KEYBOARD_LL`-Hook
(`src-tauri/src/keyboard_hook.rs`), der vor dieser Filterung sitzt —
dieselbe Technik wie Discord/AutoHotkey. Anti-Cheat-konform: der Hook
läuft komplett im Companion-Prozess, der Tastendruck wird unverändert
ans Spiel weitergereicht. Nebeneffekt: Kollisionen mit Hotkeys anderer
Programme gibt es nicht mehr.

## OCR: Multi-Frame-Erfassung

Ein Hotkey-Druck nimmt mehrere Screenshots über ~1,2 s auf
(`capture_frames`, `FRAME_COUNT`) und lässt jeden Frame durch die OCR
laufen. Das Frontend führt die Ergebnisse per Mehrheitsvotum zusammen
(`merge-work-orders.ts`): Zeilen werden über die y-Position der Namenszeile
zugeordnet, Menge/Qualität pro Zeile gevotet (Ausreißer-Frames fliegen
raus, Lücken werden aus anderen Frames gefüllt), und die Fragmente langer
Laufschrift-Namen über die Frames gesammelt und gegen den Erz-Katalog
gematcht. Deutsche Terminal-Header sind über Alias-Tabellen in
`ocr-parse.ts` vorbereitet (aktiv, sobald deutsche Terminal-Screenshots als
Fixtures vorliegen).

## OCR-Sprachpaket

Die Texterkennung nutzt bevorzugt die englische Windows-OCR-Engine
(Spieltexte sind englisch) und fällt sonst auf die Profilsprache zurück —
die de-DE-Engine liest englische Terminals brauchbar, aber mit mehr
Verlesern (QUALITY→OUALITY, 575→S7S; der Parser normalisiert die
häufigsten). Für beste Ergebnisse das englische Sprachpaket installieren:
Einstellungen → Zeit und Sprache → Sprache & Region → „Englisch
(Vereinigte Staaten)" hinzufügen (Texterkennung-Feature genügt).

## Bekannte Stolperfalle: Spiel läuft als Administrator

Läuft der RSI Launcher (und damit Star Citizen) mit Admin-Rechten, blockiert
Windows (UIPI) globale Hotkeys **aller** nicht-erhöhten Programme, solange das
Spiel den Fokus hat — das betrifft auch Discord/OBS und den Companion-Hotkey.
Abhilfe: Launcher ohne Admin-Rechte starten, oder den Companion ebenfalls
als Administrator ausführen. Der Hotkey feuert dann wieder im Spiel.
Die Einstellungen erkennen diesen Fall (`get_game_elevation_status`,
Token-Elevation-Vergleich) und zeigen eine entsprechende Warnung an.

## Manuelle Test-Checkliste (nicht automatisierbar)

Nach relevanten Änderungen von Hand prüfen:

- [ ] Globaler Hotkey feuert, während Star Citizen im Borderless-Fullscreen läuft
      **und den Fokus hat** (Raw-Input-Fall — der eigentliche Kerntest)
- [ ] Hotkey-Rebind in den Einstellungen per Tastendruck (Aufnahme-Feld);
      ungültige Kombination zeigt Meldung und der alte Hotkey bleibt aktiv
- [ ] Gehaltene Hotkey-Taste löst nur EINE Erfassung aus (kein Auto-Repeat)
- [ ] Einstellungen warnen, wenn Star Citizen als Administrator läuft und der
      Companion nicht (Hotkey feuert dann im Spiel nicht)
- [ ] OCR-Genauigkeit am Refinery-Terminal bei 1080p / 1440p / 4K
- [ ] Native Benachrichtigung erscheint, wenn ein Job fertig wird
- [ ] Tray-Verhalten: Close-to-Tray, Wiederherstellen, Single-Instance
- [ ] Session-Token übersteht App-Neustart (Windows Credential Manager)
- [ ] Update-Dialog erscheint beim Start, wenn ein neueres Release existiert;
      "Später" lässt die App normal laufen
- [ ] Einstellungen: Version wird angezeigt, "Nach Updates suchen" findet
      neue Releases und installiert per Klick (App startet danach neu)
