# AGENTS.md — Arbeitsregeln für Coding-Agents

STARVEIN ist eine Star-Citizen-Mining-Referenz (Next.js 16, App Router, Tailwind v4,
MongoDB, next-intl de/en). Dieses Dokument ist der Einstiegspunkt für alle Coding-Agents
(Claude Code, Codex, Cursor, …).

## Pflichtlektüre nach Aufgabe

1. **`CLAUDE.md`** — vollständige Arbeitsgrundlage: Vision, Tech-Stack, Domänenmodell,
   Slice-Roadmap, TDD-Vorgehen und die **bindenden CIG-Branding-Pflichten (§2)**.
2. **`design-system/MASTER.md`** — verbindliches Design-System „Tiefes All 2.0":
   Token-Semantik, UI-Primitives, Motion-Regeln, Starfield, A11y-/Test-Leitplanken.
   Vor jeder Änderung an UI, Styling oder Interaktion lesen.
3. Token-**Werte**: `src/app/globals.css` (Quelle der Wahrheit, `@theme`-Block).

## Nicht verhandelbar (Kurzfassung)

- Der wortwörtliche RSI-Fansite-Disclaimer + Link zu robertsspaceindustries.com bleibt
  auf jeder Seite sichtbar (`src/lib/components/FanDisclaimer.tsx`). Der permanente
  Test `e2e/branding-compliance.spec.ts` wird nie entfernt, geskippt oder abgeschwächt.
- `e2e/responsive.spec.ts` (kein H-Overflow bei 375/768 px) darf erweitert, nie
  geschwächt werden. Mobile-first: Basis = Mobile, dann `sm:`/`md:`/`lg:`.
- TDD: Test zuerst (Vitest/Testing Library, Integration mit mongodb-memory-server),
  jede Änderung endet mit grünem `pnpm lint && pnpm test && pnpm test:e2e`.
- UI-Strings nur über next-intl (de **und** en pflegen), keine hartcodierten Texte.
- UI bauen ausschließlich mit den Primitives aus `src/lib/components/ui/` und den
  Token-Utilities — keine kopierten Klassenstrings, keine Roh-Hexwerte, keine neuen
  UI-/Animations-/Icon-Dependencies (Icons: lucide-react).
- `playwright.config.ts`: `reducedMotion`-Emulation und `workers: 8` nie entfernen
  (WebGL-Starfield macht Headless-Läufe sonst flaky).

## Kommandos

```bash
pnpm install && docker compose up -d   # Setup (Mongo + Redis)
pnpm seed                              # kuratierte Daten
pnpm dev                               # Dev-Server :3000
pnpm lint && pnpm test                 # ESLint + Vitest
pnpm test:e2e                          # Playwright (baut & startet auf :3100)
```

Commits: englisch, Conventional Commits, kein Co-Authored-By.
