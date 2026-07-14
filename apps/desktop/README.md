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

## Bekannte Stolperfalle: Spiel läuft als Administrator

Läuft der RSI Launcher (und damit Star Citizen) mit Admin-Rechten, blockiert
Windows (UIPI) globale Hotkeys **aller** nicht-erhöhten Programme, solange das
Spiel den Fokus hat — das betrifft auch Discord/OBS und den Companion-Hotkey.
Abhilfe: Launcher ohne Admin-Rechte starten, oder den Companion ebenfalls
als Administrator ausführen. Der Hotkey feuert dann wieder im Spiel.

## Manuelle Test-Checkliste (nicht automatisierbar)

Nach relevanten Änderungen von Hand prüfen:

- [ ] Globaler Hotkey feuert, während Star Citizen im Borderless-Fullscreen läuft
- [ ] Hotkey-Rebind in den Einstellungen per Tastendruck (Aufnahme-Feld); belegte
      Kombination zeigt Warnung und der alte Hotkey bleibt aktiv
- [ ] Einstellungen zeigen eine Warnung, wenn der aktive Hotkey vom System nicht
      registriert werden konnte (z. B. weil eine andere Anwendung ihn hält)
- [ ] OCR-Genauigkeit am Refinery-Terminal bei 1080p / 1440p / 4K
- [ ] Native Benachrichtigung erscheint, wenn ein Job fertig wird
- [ ] Tray-Verhalten: Close-to-Tray, Wiederherstellen, Single-Instance
- [ ] Session-Token übersteht App-Neustart (Windows Credential Manager)
