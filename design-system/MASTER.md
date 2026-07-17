# STARVEIN Design-System „Tiefes All 2.0" — MASTER

> Verbindliche Design-Referenz für Menschen und Coding-Agents. Bei Widersprüchen gilt:
> `src/app/globals.css` ist die Quelle der Wahrheit für Token-**Werte**, dieses Dokument
> für **Verwendungsregeln**. Rechtliche Branding-Pflichten (RSI-Disclaimer etc.) stehen
> in `CLAUDE.md` §2 und sind nicht verhandelbar.

## 1. Richtung

Dunkles Blau/Indigo mit holografischen Cyan/Eisblau-Akzenten (Star-Citizen-HUD-Gefühl),
WebGL-Sternenhintergrund hinter allen Seiten, Glas-Panels, spürbare aber datenfreundliche
Sci-Fi-Motion. **Kein** Terminal-Retro-Look, **kein** Warnfarben-Industrial-Look.
Datentabellen haben immer Vorrang vor Dekoration — STARVEIN ist ein Referenztool.

## 2. Farb-Tokens (Semantik)

Tokens sind als `@theme`-Block in `src/app/globals.css` definiert und erzeugen
Tailwind-Utilities (`bg-bg-void`, `text-accent-cyan`, `shadow-glow`, …).
**Nie Roh-Hex in Komponenten** — immer Token-Utilities.

| Token                                                    | Verwendung                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `bg-void`                                                | Seitenhintergrund (liegt hinter dem Starfield-Fallback)                                                            |
| `bg-nebula` / `bg-nebula-2`                              | Solide Panels / erhöhte Flächen & Hover                                                                            |
| `accent-primary` (Violett)                               | Primäraktionen, Standard-Links (CTA-Buttons, GlowLink)                                                             |
| `accent-secondary` (Blau)                                | Signatur-/Zahlenwerte in Tabellen                                                                                  |
| `accent-glow` (Eisblau)                                  | Hover-Zustand von Links/CTAs                                                                                       |
| `accent-cyan`                                            | Aktive Navigation, Fokusringe, aktive Filter — der „HUD-Akzent"                                                    |
| `accent-ice`                                             | Helle Highlights, Hero-Headline, Brand-Hover                                                                       |
| `rarity-*` (5 Stufen)                                    | ausschließlich Erz-Seltenheit — Zuordnung nur über `RARITY_TEXT_CLASS` aus `src/lib/rarity.ts`, nie neu definieren |
| `success` / `warning`                                    | verified/confirmed bzw. unverified/disputed — nie dekorativ                                                        |
| `glass` / `glass-border`                                 | Glas-Oberflächen: sticky Header, Footer, Info-Panels                                                               |
| `shadow-glow-sm` / `shadow-glow` / `shadow-glow-primary` | Glow-Effekte (Hover, Fokus, aktive Filter / Primär-CTA)                                                            |

Regel: **Cyan = Zustand** (aktiv/fokussiert), **Violett = Aktion** (klickbar),
**Blau = Messwert**, **Eisblau = Glanzlicht**. Nicht mischen.

## 3. Typografie

- `font-sans` (Inter): aller Fließtext und UI-Text.
- `font-mono` (JetBrains Mono): **ausschließlich** Zahlen-/Codewerte — Erzcodes,
  Signaturen, Preise, Prozente — plus Brand-Schriftzug. Vermittelt „Instrumenten-Ablesung".
- Seitentitel `text-2xl font-semibold` (via `PageHeader`), Abschnitte `text-lg font-medium`.
- Hero-Headline: `font-mono tracking-widest text-accent-ice` mit Text-Glow
  (`[text-shadow:0_0_28px_rgb(94_230_255_/_0.35)]`).

## 4. UI-Primitives (immer verwenden, nie Klassen kopieren)

Alle unter `src/lib/components/ui/`:

| Komponente                              | Zweck / Regel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageShell`                             | Zentrierte Seiten-Spalte (`width="wide"` für datenbreite Seiten). Jede Page nutzt sie — nie den Container-String inline schreiben.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `PageHeader`                            | h1 + optionaler Untertitel, bringt `animate-reveal` mit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `Panel` / `panelClasses()`              | Karten-Shell. `variant="glass"` für Info-/Community-Panels, `hover` für klickbare Karten (Lift + Cyan-Border + Glow). `panelClasses()` für Link-Cards (`<Link className={cn(panelClasses({hover:true}), …)}>`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `DataTable` + `DataTableHead/Row/Th/Td` | Alle Datentabellen. Responsive Spalten via `className="hidden sm:table-cell"` auf Th **und** Td.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `Badge`                                 | Status-Chips; `tone="success"` bzw. `tone="warning"`, Rarity-Farbe via `className`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `Button`                                | `primary` (CTA mit Glow) / `ghost`. Kein `<button>` mit eigenen CTA-Klassen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `GlowLink`                              | Standard-Datenlink (violett → eisblau, Underline on hover), wrappt den locale-bewussten Link.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `AnimatedNumber`                        | Zahlenwerte, die sich per Filter/Daten ändern können. Formatiert locale-bewusst intern (next-intl) — **keine** Format-Funktion als Prop von Server-Components.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `FilterGroup` (`src/lib/components/`)   | Alle Button-Filtergruppen (nuqs-URL-State). Aktiv = `text-accent-cyan shadow-glow-sm`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `NavDropdown` (`src/lib/components/`)   | Nav-Gruppen als Disclosure (Click-to-open, kein Hover-only): `aria-expanded` + `aria-controls`, bewusst **kein** `aria-haspopup`/`role="menu"` (Panel ist eine schlichte Link-Liste). Escape schließt + Fokus zurück auf den Trigger (`stopPropagation`, damit der Mobile-Drawer offen bleibt), Blur/Outside-Click schließt, aktives Kind trägt `aria-current="page"`, Gruppen-Trigger wird cyan, sobald eine Kind-Route aktiv ist. Kind-Links existieren genau **einmal** im DOM (< sm statische Drawer-Sektion, ab sm schwebendes Panel — Playwright-Strict-Mode zählt versteckte Duplikate). Sanktionierte Ausnahme zur Primitive-Regel: die Glass-Panel-Klassen sind dort sm:-präfixiert dupliziert, weil `panelClasses()` nicht breakpoint-scopebar ist. Gruppenzuschnitt in `nav-items.ts`. |

Icons: **nur `lucide-react`** (tree-shaken, `size-4`/`size-5`, `aria-hidden` + Text-Label
oder `aria-label`). Keine Emoji, keine Unicode-Glyphen (★ ▲ etc.) als Icons.

## 5. Motion-Regeln

- Dauer 150–300 ms; rein = ease-out (`--ease-hud`), raus = ease-in. Nichts über 500 ms
  außer dem Starfield-Boost (700 ms) und `glow-pulse` (2,4 s, nur Dauer-Loops).
- Verfügbare Utilities: `animate-reveal` (Einblenden + 6 px Rise), `animate-fade-in`
  (Seiten-/Content-Fade), `animate-glow-pulse` (sparsam!).
- Stagger: inline `style={{ animationDelay: \`${Math.min(index, 9) * 40}ms\` }}` —
  Deckelung bei ~10 Elementen, nur für Card-Grids/Listen, **nicht** für Tabellenzeilen.
- Seitenwechsel: `src/app/[locale]/template.tsx` (200 ms Fade) + Starfield-Drift-Boost
  über `starfield-bus`. Kein View-Transitions-API, kein framer-motion.
- Hover: Farb-/Glow-Transitions (`transition-colors`/`transition-all duration-150/200`),
  Lifts nur via `transform` (nie width/height/top animieren).
- **Reduced motion:** globaler Kill-Switch in `globals.css` beendet alle Animationen
  sofort. Neue Motion muss darunter funktionieren (Inhalt ohne Animation voll sichtbar,
  `animation-fill-mode: both` + Endzustand = sichtbar). JS-Motion prüft
  `prefers-reduced-motion` selbst (siehe `AnimatedNumber`, `Starfield`).

## 6. Starfield

`src/lib/components/starfield/` — eigener WebGL1-Renderer, keine Dependency.
Regeln für Änderungen:

- Engine bleibt DOM-frei (testbare pure Funktionen exportiert); die React-Komponente
  verdrahtet Events. Boost-Kopplung nur über `starfield-bus.ts`.
- CSS-Fallback (`.starfield-fallback` in globals.css) liegt **immer** unter dem Canvas
  und ist der einzige Pfad bei reduced-motion / ohne WebGL / Context-Loss.
- Performance-Leitplanken nicht lockern: DPR-Cap 1,5, Sternzahl `min(650, width*0.5)`,
  2 Nebel-Oktaven < 640 px, rAF-Pause bei `visibilitychange`.
- Inhalte müssen ohne Starfield vollständig funktionieren (progressive enhancement).
- **Drifting Ships** (`DriftingShips.tsx`): dekorative Mining-Schiff-Silhouetten,
  nur ab `lg`, rein CSS-animiert, Basisposition offscreen (reduced-motion-sicher).
  Es sind **eigene stilisierte SVGs (Fan-Art)** — niemals CIG-Render/PNGs aus dem
  Netz oder Wiki einbinden (CLAUDE.md §2); Fankit-Assets nur nach bewusster
  Entscheidung inkl. Logo-Pflicht.

## 7. Layout & Responsive

- Mobile-first: Basisklassen = Mobile, dann `sm:` / `md:` / `lg:`. Kein horizontales
  Scrollen bei 375/768/1280/2560 px (permanenter E2E-Test).
- Breite Inhalte scrollen in ihrem eigenen Container (`DataTable` bringt
  `overflow-x-auto` mit).
- Primärnavigation: 6 Top-Level-Einträge (3 Disclosure-Gruppen + 3 Direktlinks,
  Zuschnitt in `src/lib/components/nav-items.ts`). Regime: < 640 px Burger-Drawer
  mit Gruppen-Sektionen, 640–1279 px eigene Nav-Zeile unter der Header-Zeile,
  **ab xl einzeilig bis WQHD** (permanenter E2E-Höhencheck < 80 px bei 1280/2560).
  Header-Inhalt zentriert auf `max-w-[90rem]` (gleiche Kante wie `PageShell` xl),
  die Glass-Leiste bleibt full-bleed.
- Sticky-Header ist ~60 px (einzeilig ab xl) / ~120 px (sm–xl, 2 Zeilen) /
  ~135 px (Mobile) hoch — Anker-Ziele brauchen
  `scroll-mt-40 sm:scroll-mt-32 xl:scroll-mt-24`.
- Z-Ebenen: Starfield `-z-10` (fixed), Inhalt normal, Suche-Dropdown `z-10`,
  Nav-Dropdown-Panels `z-10` (im Stacking-Context des Headers), Header `z-40`.

## 8. A11y- & Test-Leitplanken (hart)

- Fokus: globaler `:focus-visible`-Ring (cyan + Glow) in globals.css — nie per
  `outline-none` entfernen ohne Ersatz.
- Cursor-Regel (`@layer base` in globals.css) bleibt wortgleich erhalten.
- Aktive Navigation trägt `aria-current="page"`.
- Accessible Names müssen kollisionfrei bleiben: Header-Suche heißt exakt „Search",
  die Hero-Suche „Find ores and locations" — neue Suchfelder/Labels dürfen weder
  „Search" noch „Ore" als Substring-Falle für bestehende Specs einführen
  (Playwright matcht Namen per Substring). Formularfelder mit explizitem
  `htmlFor`/`id` verknüpfen, nicht per wrappendem `<label>` um ein `<select>`.
- Geschützte Assertions: `ExplorerTable`-Methodenspalte exakt `hidden sm:table-cell`;
  `OreList`-Zeilen behalten `id`-Anker; `SiteFooter`-Disclaimer (Text + RSI-Link) nie anfassen.
- E2E läuft mit `reducedMotion: "reduce"`-Emulation und 8 Workern
  (`playwright.config.ts`) — beides nie entfernen (Starfield sättigt sonst den
  Headless-Renderer und URL-State-Tests werden flaky).

## 9. Do / Don't

**Do:** Primitives wiederverwenden · Token-Utilities · lucide-Icons · Stagger auf Cards ·
Glas nur für Header/Footer/Info-Panels · Mono nur für Zahlen/Codes.

**Don't:** Klassenstrings aus anderen Komponenten kopieren statt Primitive erweitern ·
neue Farb-Hexwerte inline · framer-motion/three.js/Icon-Sets ergänzen ·
Animation > 500 ms im UI · `RARITY_TEXT_CLASS` duplizieren · Disclaimer-/Test-Leitplanken
„temporär" lockern.
