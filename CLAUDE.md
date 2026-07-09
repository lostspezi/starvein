# STARVEIN — Star Citizen Mining Reference

> Arbeitstitel, gern umbenennen. Ein Regolith-Nachfolger: Übersicht, wo welches Erz mit welcher
> Wahrscheinlichkeit vorkommt, nach welcher Scan-Signatur man Ausschau halten sollte — für
> Ship-Mining, ROC und FPS-Handmining.

## 0. Hinweise für Claude Code

Diese Datei ist die Arbeitsgrundlage für die Entwicklung in Claude Code. Bitte so vorgehen:

- **Ein Vertical Slice pro Session/Commit-Batch**, nie mehrere parallel anfangen.
- **TDD strikt**: Für jede Slice zuerst einen scheiternden Test schreiben (Unit oder Integration),
  dann minimal implementieren, dann refactoren. Kein Produktionscode ohne vorher geschriebenen Test.
- Reihenfolge der Slices in Abschnitt 11 einhalten — sie bauen bewusst aufeinander auf.
- Bei Unsicherheit über exakte UEX-API-Feldnamen: **zuerst live gegen
  `https://uexcorp.space/api/documentation/` verifizieren**, nicht raten. Die API ist
  community-gepflegt und ändert sich zwischen Patches.
- Design-Tokens aus Abschnitt 7 von Anfang an verwenden, nicht generische Tailwind-Defaults.
- i18n (de/en) ist ab Slice 0 aktiv — keine hartcodierten UI-Strings, auch nicht "nur für jetzt".
- **Die CIG-Branding-Pflichten aus Abschnitt 2 sind nicht verhandelbar und gelten ab Slice 0.**
  Der Pflicht-Disclaimer, der Link zur offiziellen Seite und die Domain-Regeln müssen in jeder
  Slice erhalten bleiben. Slice 0 legt dafür einen permanenten Playwright-Test an (siehe Abschnitt
  11), der bei jedem späteren `pnpm test:e2e` mitläuft — dieser Test darf nie entfernt oder
  übersprungen werden, auch nicht "temporär".

---

## 1. Vision & Kontext

Regolith.rocks war die zentrale Community-Referenz für Mining in Star Citizen: wo welches Erz
vorkommt, mit welcher Wahrscheinlichkeit, und wie man es an der Scan-Signatur erkennt. Die Seite
wurde am 1. Juni 2026 abgeschaltet. STARVEIN soll diese Lücke füllen — als Open-Source-Projekt,
das die Community selbst aktuell hält.

**V1-Kernfunktionen:**

1. Erz-Referenz: alle minebaren Erze mit Seltenheit, Kategorie, Basiswerten.
2. Location-Browser: Sternsysteme → Himmelskörper → Locations (Planet, Mond, Lagrange-Punkt,
   Asteroidengürtel, Outpost, Höhle).
3. Vorkommen & Wahrscheinlichkeit: pro Erz und Mining-Methode (Ship / ROC / FPS), wo es zu
   welcher Wahrscheinlichkeit vorkommt.
4. Signatur-Referenz: worauf man beim Scannen achten muss, getrennt nach Methode (siehe 6.2 für
   die fachlichen Unterschiede).
5. Refinery-Yield & Verkaufspreise pro Erz (aus UEX Corp API gesynct).
6. Community-Korrekturen mit Wiki-Style-Voting (kein Admin-Gate nötig).
7. Login (Discord/Twitch/Google) fürs Speichern von Favoriten/Routen — v1 minimal, Ausbau später.

**Nicht in v1** (siehe Abschnitt 15): Routenplanung/Optimierung, Preis-Alerts, Mobile App,
Moderations-Backoffice, eigene p4k-Datenextraktion.

---

## 2. Rechtliches & CIG-Branding-Pflichten (bindend)

Cloud Imperium Games / Roberts Space Industries (RSI) haben eine offizielle **Fansite-Policy**
(RSI Knowledge Base, "Star Citizen Fankit and Fandom FAQ"). Das ist kein Vorschlag, sondern
Bedingung dafür, dass das Projekt überhaupt geduldet wird — CIG behält sich ausdrücklich vor,
Rechte gegen Seiten durchzusetzen, die diese Regeln nicht einhalten. Diese Regeln gelten für
**jede** Slice, nicht nur für den Launch, und dürfen von Claude Code nie stillschweigend
gelockert werden.

**Pflicht-Disclaimer** — muss auf jeder Seite offen sichtbar sein (nicht klein gedruckt, nicht
versteckt im Footer-Kleingedruckten zwischen anderen Zeilen), wortwörtlich in dieser Form:

```
This is an unofficial Star Citizen fansite, not affiliated with the Cloud Imperium group of
companies. All content on this site not authored by its host or users are property of their
respective owners.
```

Auf Deutsch als UI-Übersetzung _zusätzlich_ möglich, aber der englische Originaltext (oben) muss
immer mitgeführt werden, da er die von RSI vorgegebene Formulierung ist.

**Weitere bindende Regeln:**

- Ein sichtbarer Link zur offiziellen Seite (`https://robertsspaceindustries.com`) muss auf jeder
  Seite vorhanden sein (z. B. im Footer neben dem Disclaimer).
- **Domain/Projektname darf nicht enthalten:** "Star Citizen", "Roberts Space Industries",
  "Squadron 42", sowie keine Namen von In-Game-Entitäten (Schiffshersteller wie Aegis, Anvil,
  Origin, RSI-Ships etc.) — "STARVEIN" ist unkritisch, aber bei Umbenennung gegenprüfen.
- **Verbotene Begriffe** in Marketing-/UI-Texten über das Projekt selbst: "official", "genuine",
  "licensed", "endorsed" oder Formulierungen, die eine Zusammenarbeit mit oder Billigung durch CIG
  suggerieren.
- **Kein Paywall, keine Pflicht-Registrierung fürs Grundangebot, keine kommerzielle Nutzung** —
  das Referenz-Browsing muss immer kostenlos und ohne Account nutzbar sein (Login nur für
  Favoriten/Submissions, siehe Abschnitt 8). Keine Werbung, die den fandomischen Charakter
  verwässert.
- Keine copyrightgeschützten Inhalte 1:1 übernehmen (keine Lore-Texte, keine Artworks, keine
  Screenshots aus dem Spiel). Erznamen, Zahlenwerte, Wahrscheinlichkeiten sind Fakten/Spieldaten,
  keine geschützten Werke — unkritisch.
- Falls später Fankit-Assets (Logos, Wallpaper) verwendet werden: Pflicht-Logo mit mindestens 50 %
  Deckkraft gemäß Fankit-Style-Guide einbinden — für v1 nicht relevant, da keine offiziellen Assets
  genutzt werden.

**Datenlizenzen (Drittanbieter, unabhängig von CIG):**

- Das Diftic/SC_Signature_Scanner-Repo (siehe 6.2) steht unter MIT-Lizenz — bei Übernahme von
  Startwerten Attribution in einer `CREDITS.md` einplanen.
- SeekND/Strata ist ein sehr ähnliches Projekt ohne explizite Lizenzangabe — als Inspiration für
  Datenmodellierung ok, keine Daten wörtlich übernehmen.

**Durchsetzung:** Der Disclaimer-Block wird als eigene, gemeinsam genutzte Komponente
(`src/lib/components/FanDisclaimer.tsx` o. ä.) im Root-Layout eingebunden, nicht pro Seite manuell
kopiert — so kann er nicht versehentlich auf einer neuen Route vergessen werden. Slice 0 sichert
das zusätzlich mit einem dauerhaften Playwright-Test ab (siehe Abschnitt 11).

---

## 3. Tech-Stack

Versionsstand der Recherche: Juli 2026. Vor `pnpm create next-app` trotzdem kurz
`npm view <paket> version` je Kernpaket gegenchecken — Patch-Releases erscheinen laufend.

| Bereich                | Wahl (Stand Juli 2026)                                                                                            | Begründung                                                                                                                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework              | **Next.js 16** (16.2.x LTS), App Router, Turbopack (Standard-Bundler seit v16)                                    | Frontend + Backend (Route Handlers) in einem                                                                                                                                                                                                      |
| Runtime                | **Node.js 24 LTS** (Next.js 16 verlangt min. Node 20.9; 24 ist die aktuelle LTS-Linie, Support bis 04/2028)       | Node 22 ist ok als Fallback, aber schon in Maintenance-Modus                                                                                                                                                                                      |
| Sprache                | **TypeScript 5.9** (empfohlen, breite Tool-Kompatibilität)                                                        | TypeScript 7.0 (neuer nativer Go-Compiler, ~10× schneller) ist frisch verfügbar — erst wechseln, wenn ESLint-Plugin, Vitest und Next.js-Tooling bestätigt kompatibel sind, sonst 5.9 als sicheren Standard nehmen                                 |
| Package Manager        | **pnpm 11.x**                                                                                                     | schnell, gute Docker-Layer-Caching-Eigenschaften                                                                                                                                                                                                  |
| Datenbank              | **MongoDB Server 8.0** + Node-Driver **`mongodb`^7.5** (nativer Driver, kein Mongoose)                            | flexibles Schema für Erz-/Location-Varianten; nativer Driver + Zod ist besser testbar als Mongoose-Singletons                                                                                                                                     |
| Validierung            | **Zod 4** (v4 ist seit 2025 stabil, deutlich schneller als v3, weniger TS-Instanziierungen)                       | für API-Input, DB-Schemas und Env-Vars                                                                                                                                                                                                            |
| Caching                | Redis 7.x Server + **ioredis** (aktuelle 5.x-Linie)                                                               | UEX-API-Antworten, berechnete Confidence-Scores                                                                                                                                                                                                   |
| Auth                   | **Better Auth** + `better-auth/adapters/mongodb`                                                                  | Auth.js (ehem. NextAuth) gehört inzwischen zum Better-Auth-Team und verweist neue Projekte selbst auf Better Auth; native `socialProviders` für Discord, Twitch, Google, native MongoDB-Anbindung ohne Community-Adapter. Details in Abschnitt 8. |
| Styling                | **Tailwind CSS v4.3** — CSS-first Konfiguration über `@theme` direkt im CSS, kein `tailwind.config.js` mehr nötig | eigenes Design-System (Abschnitt 7), keine generischen Defaults                                                                                                                                                                                   |
| i18n                   | **`next-intl` v4**                                                                                                | Server-Component-fähig, de/en von Anfang an; Middleware-Datei heißt in Next.js 16 `proxy.ts` (nicht mehr `middleware.ts`)                                                                                                                         |
| Unit/Integration-Tests | **Vitest 4.1** + `mongodb-memory-server`                                                                          | echte Mongo-Instanz im Test statt Mock-Friedhof                                                                                                                                                                                                   |
| Component-Tests        | React Testing Library                                                                                             |                                                                                                                                                                                                                                                   |
| E2E-Tests              | **Playwright 1.61**                                                                                               | ein Happy-Path-Test pro Slice                                                                                                                                                                                                                     |
| API-Mocking            | MSW                                                                                                               | UEX-API in Tests mocken                                                                                                                                                                                                                           |
| Lint/Format            | ESLint + Prettier + Husky/lint-staged                                                                             | Pre-Commit-Hooks                                                                                                                                                                                                                                  |
| Client-State           | React Server Components primär, `nuqs` für URL-State bei Filtern                                                  | so wenig Client-State wie möglich                                                                                                                                                                                                                 |

---

## 4. Architekturprinzipien: Vertical Slices + TDD

Keine klassische Schichtenarchitektur (`/controllers`, `/services`, `/models` quer durchs ganze
Projekt). Stattdessen **ein Feature = ein Ordner**, der UI, Route Handler, DB-Zugriff und Tests für
genau dieses Feature enthält:

```
src/features/ore-occurrences/
  ├── ore-occurrences.repository.ts       # DB-Zugriff (nativer Mongo-Driver)
  ├── ore-occurrences.repository.test.ts  # Integration-Test mit mongodb-memory-server
  ├── ore-occurrences.schema.ts           # Zod-Schema + TS-Typen
  ├── route.ts                            # Next.js Route Handler (GET /api/ore-occurrences)
  ├── route.test.ts                       # Integration-Test des Endpoints
  ├── OreOccurrenceList.tsx               # UI-Komponente
  └── OreOccurrenceList.test.tsx          # Component-Test
```

Geteilte Dinge (DB-Connection-Singleton, Redis-Client, Auth-Config, Design-Tokens) liegen in
`src/lib/`. Cross-Feature-Wiederverwendung ist die Ausnahme, nicht die Regel.

**TDD-Loop pro Slice:**

1. Red: Test für den nächsten dünnen Schnitt schreiben (z. B. "GET /api/ores gibt leeres Array bei
   leerer DB zurück"), Test schlägt fehl.
2. Green: minimale Implementierung, Test wird grün.
3. Refactor: aufräumen, Test bleibt grün.
4. Wiederholen, bis die Slice funktional komplett ist.
5. Am Ende der Slice: ein Playwright-Test für den Happy Path.

---

## 5. Domänenmodell & MongoDB-Schema

Alle Collections sind pro Patch versioniert (`patchVersion`-Feld), damit alte Daten beim
Game-Update nicht stillschweigend falsch angezeigt werden.

```
starSystems
  _id, code ("STANTON" | "PYRO"), name, status ("live" | "ptu")

celestialBodies
  _id, systemId, type ("planet" | "moon" | "lagrangePoint" | "spaceStation"
                        | "outpost" | "asteroidBelt" | "cave"),
  name, parentBodyId (für Monde), uexLocationId (Mapping für Sync)

ores
  _id, code (4-Buchstaben-Code wie UEX, z. B. "QUAN", "BEXA" — siehe Liste unten),
  name_de, name_en, rarityTier ("common".."legendary"),
  mineableBy: { ship: bool, roc: bool, fps: bool }

oreOccurrences        # das Herzstück: WO mit welcher WAHRSCHEINLICHKEIT
  _id, locationId, oreId, method ("ship" | "roc" | "fps"),
  probabilityPercent (0-100), patchVersion,
  sourceType ("curated" | "community"), confidenceScore, lastVerifiedAt

signatureProfiles      # WORAUF beim Scannen achten — Semantik unterscheidet sich je Methode!
  _id, oreId, method, patchVersion,
  signatureValue | signatureRange { min, max },
  dominantCompositionRange { min, max },   # nur relevant für method="ship"
  notes, sourceType, confidenceScore

refineryYields          # aus UEX gesynct, nicht community-editierbar
  _id, oreId, refineryMethod, yieldPercent, processTimeMinutes, patchVersion, syncedAt

priceSnapshots           # aus UEX gesynct, Redis-gecacht, kurze TTL
  _id, oreId, terminalId, kind ("raw" | "refined"), sellPrice, buyPrice, syncedAt

user / session / account / verification   # Standard-Collections des Better-Auth MongoDB-Adapters
  user zusätzlich: role ("user" | "moderator" | "admin"), favorites: [{ locationId, note }]

submissions              # Community-Korrekturen
  _id, targetType ("oreOccurrence" | "signatureProfile"),
  targetId (null bei Neuanlage), proposedChange (Partial<...>),
  submittedBy (userId), createdAt,
  votes: { up: number, down: number }, voters: [{ userId, value: 1 | -1 }],
  confidenceScore, status ("pending" | "accepted" | "rejected")

patchVersions
  _id, version ("4.8.0"), releasedAt, isCurrent
```

**Wichtige fachliche Unterscheidung für `signatureProfiles`** (aus Community-Reverse-Engineering,
Stand SC 4.7/4.8 — vor Implementierung gegen aktuellen Patch verifizieren):

- **Ship-Mining** (Prospector/MOLE): die Signatur identifiziert direkt das _dominante_ Mineral
  (i. d. R. 40–80 % Zusammensetzung), Gestein enthält zusätzlich Sekundärminerale (5–20 %). Ein
  Signaturwert → ein Mineral.
- **ROC / FPS-Handmining**: die Signatur zeigt nur die _Größe_ des Vorkommens an, nicht das
  Mineral. Cluster sind zu 100 % ein einzelnes Mineral, aber welches, ergibt sich aus der
  _Location_ (Liste möglicher Minerale pro Fundort), nicht aus dem Signaturwert selbst.

Das UI muss diese beiden Fälle unterschiedlich darstellen — sonst entsteht bei ROC/FPS eine
falsche 1:1-Erwartung wie beim Ship-Mining.

**Referenz-Erzcode-Liste** (4-Buchstaben-Codes, konsistent mit UEX für einfaches Preis-Mapping):
`AGRI ALUM APHO ASLA ATAC BERA BERY BEXA BORA CARA COBA COPP CORU DIAM DOLI FEYN GLAC GOLD HADA
HEPH ICEW IRON JACO JANA LARA LIND OURA POTA QUAN QUAR RICC SADA SALD SILI STIL TARA TIN TITA
TORI TUNG` — plus die neueren Signatur-Minerale aus 4.7 (Stileron, Savrilium, Aslarite, Agricium
etc.), beim Seeding gegen die aktuelle UEX-`items`-Liste abgleichen.

---

## 6. Datenquellen-Strategie

### 6.1 UEX Corp API 2.0

- Basis: `https://uexcorp.space/api/` — kostenloser API-Key über "My Apps" auf uexcorp.space.
- Liefert: Locations pro System/Planet/Mond/POI, Refinery-Yields & -Methoden, Rohstoff- &
  Verkaufspreise, Terminals, Systeme/Planeten/Monde/Stationen als Stammdaten.
- Liefert **nicht**: Scan-Signaturwerte, Gesteinszusammensetzung — dafür Abschnitt 6.2.
- Sync-Strategie: Ein serverseitiger Sync-Job (per Cron/Route Handler mit Secret-Header
  getriggert, kein User-Request löst Sync direkt aus) zieht periodisch Preise & Yields, schreibt
  nach MongoDB, invalidiert den Redis-Cache. Preis-Endpunkte im Read-Pfad werden aus Redis bedient
  (kurze TTL, z. B. 15 Minuten), nicht live gegen UEX bei jedem Seitenaufruf.
- Vor Implementierung des Sync-Clients: exakte Endpunkt-/Feldnamen live gegen die Doku prüfen,
  nicht aus dieser Datei übernehmen (API kann sich geändert haben).

### 6.2 Kuratiertes Signatur-/Wahrscheinlichkeits-Dataset

Es gibt keine öffentliche API für Signaturwerte und Fundwahrscheinlichkeiten — diese Daten stecken
in `Game2.dcb` innerhalb des `Data.p4k` und werden von der Community patchweise per
Reverse-Engineering extrahiert. Referenzquellen für den Start-Datensatz:

- `github.com/Diftic/SC_Signature_Scanner` (**MIT-Lizenz**) — `SignatureValue.md` mit
  Signaturwerten je Mineral, getrennt nach Ship/ROC/FPS, inkl. Kompositionsfenstern.
- `github.com/RainbowRamen/sc-mining-hud` — RS-Wert-Tabelle für alle 26 Erze (4.7-Stand).

Diese Werte als **initialen Seed** für `signatureProfiles` verwenden (Attribution in
`CREDITS.md`), aber `sourceType: "curated"` und `confidenceScore` niedrig genug ansetzen, dass
Community-Bestätigungen sie im Laufe der Zeit hochstufen können. Bei jedem Game-Patch mit
Mining-Änderungen: neuen `patchVersions`-Eintrag anlegen, alte Werte nicht überschreiben, sondern
als historisch markieren (`isCurrent: false`).

### 6.3 Community-Korrekturen & Vote-Konfidenz-System

Wiki-Style, kein Admin-Gate:

- Eingeloggte Nutzer können Korrekturen zu `oreOccurrences` oder `signatureProfiles` einreichen
  → landet als `submissions`-Dokument mit `status: "pending"`.
  - Bei neuen Vorschlägen für einen **bestehenden** Datensatz: Original bleibt sichtbar,
    Vorschlag wird daneben mit "vorgeschlagene Änderung"-Badge angezeigt.
  - Bei **neuen** Fundorten/Signaturen: sofort sichtbar, aber mit "unbestätigt"-Badge, bis genug
    Stimmen vorliegen.
- Jeder eingeloggte Nutzer kann pro Submission einmal up-/downvoten (1 Stimme/User, per
  `voters`-Array durchgesetzt; zusätzlich Rate-Limiting über Redis gegen Spam).
- **Confidence Score = Wilson-Score-Lower-Bound** (klassischer "Best"-Sortieralgorithmus,
  z. B. wie früher bei Reddit) statt simpler `up - down`-Differenz — verhindert, dass 2 Upvotes ohne
  Downvotes höher gewichtet werden als 40 Upvotes bei 5 Downvotes.
- Schwellwerte (Startwerte, später tunen): Score ≥ 0,7 bei ≥ 5 Stimmen → `status: "accepted"`,
  Daten werden in die reguläre `oreOccurrences`/`signatureProfiles`-Collection übernommen
  (`sourceType: "community"`). Score ≤ 0,2 bei ≥ 5 Stimmen → `status: "rejected"`, ausgeblendet.
  Dazwischen: bleibt `pending`, sichtbar mit Badge.
- Kuratierte (`sourceType: "curated"`) Einträge können ebenfalls Downvotes/Korrekturvorschläge
  bekommen und werden bei starkem Community-Widerspruch als "umstritten" markiert — auch offizielle
  Startdaten sind nicht unfehlbar.

---

## 7. Design-System "Tiefes All"

Richtung: dunkles Blau/Violett, Nebel-Optik, elegant und clean — kein Terminal-Retro-Look, kein
Warnfarben-Industrial-Look.

**Farb-Tokens** — Tailwind v4 ist CSS-first: die Tokens kommen als `@theme`-Block direkt in
`app/globals.css` (kein `tailwind.config.js` für Farben mehr nötig), das generiert automatisch
Utilities wie `bg-void`, `text-accent-primary` usw.:

```css
@import "tailwindcss";

@theme {
  --color-bg-void: #0a0e1a; /* Haupt-Hintergrund, fast schwarz mit Blaustich */
  --color-bg-nebula: #131a2e; /* Karten/Panels */
  --color-bg-nebula-2: #1c2540; /* erhöhte Panels, Hover */
  --color-accent-primary: #7c6cf0; /* Violett — Primäraktionen, Links */
  --color-accent-secondary: #4c9ef0; /* Blau — sekundäre Akzente, Signatur-Werte */
  --color-accent-glow: #a78bfa; /* helles Violett für Glow-Effekte, aktive States */
  --color-rarity-common: #8b95b0;
  --color-rarity-uncommon: #4c9ef0;
  --color-rarity-rare: #a78bfa;
  --color-rarity-epic: #e0a83c; /* bewusster Kontrastbruch für Seltenheit, nicht Blau/Violett */
  --color-rarity-legendary: #f06c9e;
  --color-text-primary: #e8eaf5;
  --color-text-muted: #8b95b0;
  --color-success: #4ade80; /* verified/confirmed */
  --color-warning: #fbbf24; /* unverified/disputed */
}
```

Tailwind v4 nutzt intern OKLCH-Farbraum für die generierten Abstufungen — die Hex-Werte oben
sind der Ausgangspunkt, `@theme` erzeugt daraus automatisch konsistente Utilities.

**Typografie:** eine klare Sans-Serif für Fließtext (z. B. Inter), eine Mono-Font ausschließlich
für Zahlenwerte/Signaturen (z. B. JetBrains Mono) — vermittelt "Instrumenten-Ablesung" ohne in den
Terminal-Retro-Look zu kippen.

**Motive:** dezente Nebel-/Sternfeld-Hintergründe (SVG/Canvas, sehr subtil, niedrige Opacity,
keine Ablenkung von Daten), abgerundete Panels mit leichtem Glow-Border bei Hover, keine harten
Schatten. Datentabellen bekommen Priorität vor Dekoration — es ist ein Referenztool, keine Lore-Seite.

---

## 8. Auth-Konzept

- **Better Auth** statt Auth.js/NextAuth: Auth.js ist inzwischen Teil des Better-Auth-Teams und
  die eigene Doku verweist neue Projekte auf Better Auth — für ein neues Projekt in 2026 ist das
  die sinnvollere Wahl (native MongoDB-Anbindung, kein Community-Adapter nötig, TypeScript-first).
- `lib/auth.ts` (Grundgerüst):

```ts
import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";

const client = new MongoClient(process.env.MONGODB_URI!);

export const auth = betterAuth({
  database: mongodbAdapter(client.db()),
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
    twitch: {
      clientId: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [nextCookies()],
});
```

- v1-Nutzung: nur zum Speichern von Favoriten (Locations/Routen merken) und zum Einreichen/Voten
  von Community-Korrekturen. Kein Zwangs-Login zum reinen Browsen der Referenzdaten (siehe
  Branding-Pflicht in Abschnitt 2 — Grundangebot muss ohne Account nutzbar bleiben).
- Rollen: `user` (Standard). Rollenmodell so anlegen, dass `moderator`/`admin` später ergänzbar
  ist, ohne Schema-Migration (`role` als `additionalField` am User-Objekt, default `"user"`).
- Sessions: Better Auth verwaltet Sessions standardmäßig DB-gestützt mit Cookie-Cache
  (kurzlebiger Edge-tauglicher Cache vor jedem DB-Read) — für v1 ausreichend, keine zusätzliche
  JWT-Konfiguration nötig.

---

## 9. i18n-Konzept

- `next-intl`, Locales `de` und `en`, Locale-Prefix-Routing (`/de/...`, `/en/...`), Default anhand
  `Accept-Language`-Header, manueller Switcher im Header.
- Übersetzungsdateien pro Feature-Slice mitziehen (`src/features/ores/messages/de.json`,
  `en.json`), nicht eine große globale `messages.json` — passt zum Vertical-Slice-Prinzip.
- Spielbegriffe (Erznamen, Ortsnamen, Schiffsnamen) bleiben unübersetzt/identisch — nur UI-Text
  wird übersetzt.

---

## 10. Projektstruktur

```
starvein/
├── src/
│   ├── app/                        # Next.js App Router: Layouts, Pages, i18n-Routing
│   │   └── [locale]/...
│   ├── proxy.ts                     # next-intl-Middleware (in Next.js 16 umbenannt von middleware.ts)
│   ├── features/                   # Vertical Slices, siehe Abschnitt 4
│   │   ├── ores/
│   │   ├── locations/
│   │   ├── ore-occurrences/
│   │   ├── signature-profiles/
│   │   ├── refinery-and-prices/
│   │   ├── favorites/
│   │   └── submissions/
│   ├── lib/
│   │   ├── db.ts                   # Mongo-Connection-Singleton
│   │   ├── redis.ts
│   │   ├── auth.ts                 # Better-Auth-Konfiguration (siehe Abschnitt 8)
│   │   ├── uex-client.ts           # UEX-API-Client
│   │   ├── confidence-score.ts     # Wilson-Score-Berechnung
│   │   └── components/
│   │       └── FanDisclaimer.tsx   # Pflicht-Disclaimer + Link, siehe Abschnitt 2 — im Root-Layout eingebunden
│   └── test/
│       ├── setup.ts
│       └── factories/              # Test-Datenbuilder pro Domänenobjekt
├── scripts/
│   ├── seed.ts                     # kuratiertes JSON → MongoDB
│   └── sync-uex.ts                 # UEX-Sync-Job
├── data/
│   └── curated/                    # versionierte, kuratierte Seed-JSONs (per Patch)
├── e2e/                             # Playwright-Tests (inkl. permanentem Branding-Compliance-Test)
├── docker-compose.yml               # lokale Dev-Dienste (Mongo, Redis)
├── docker-compose.prod.yml          # VPS: app, mongo, redis, caddy
├── Dockerfile
├── Caddyfile
└── CLAUDE.md                        # diese Datei
```

---

## 11. Vertical-Slice-Roadmap

Jede Slice endet lauffähig, getestet, mit einem grünen Playwright-Happy-Path.

**Slice 0 — Walking Skeleton**
Next.js-App bootet, verbindet sich mit Mongo + Redis (aus `docker-compose.yml`), ein
Health-Check-Route-Handler (`/api/health`), next-intl-Routing mit de/en aktiv (`proxy.ts`),
Tailwind-Theme aus Abschnitt 7 eingebunden, eine leere Startseite mit Locale-Switcher. Die
`FanDisclaimer`-Komponente aus Abschnitt 2 wird im Root-Layout eingebunden. CI-Skripte (`lint`,
`test`, `test:e2e`) laufen durch. Ziel: die gesamte Kette ist bewiesen lauffähig und testbar,
bevor Fachlogik entsteht.
Zusätzlich: ein **permanenter Playwright-Test** (`e2e/branding-compliance.spec.ts`), der auf
jeder gerouteten Seite prüft, dass der wortwörtliche Pflicht-Disclaimer aus Abschnitt 2 sichtbar
ist und ein Link zu `robertsspaceindustries.com` existiert. Dieser Test läuft ab jetzt in jeder
folgenden Slice mit und darf nie gelöscht, geskippt oder abgeschwächt werden — er ist die
technische Absicherung dafür, dass die Branding-Pflicht wirklich "immer" eingehalten wird und
nicht nur beim Start einmal geprüft wurde.

**Slice 1 — Erz-Referenz**
`GET /api/ores`, Ore-Liste-UI mit Seltenheit/Kategorie-Filter. Daten aus
`data/curated/ores.json` per Seed-Skript.

**Slice 2 — Location-Browser**
Sternsystem → Himmelskörper → Location-Hierarchie, Navigation/Breadcrumbs.

**Slice 3 — Vorkommen & Wahrscheinlichkeit** (Kernfeature)
Zwei Sichten: "Erz auswählen → alle Fundorte + Wahrscheinlichkeit + Methode, sortiert" und
"Location auswählen → alle Vorkommen dort". Filter nach Mining-Methode (Ship/ROC/FPS).

**Slice 4 — Signatur-Referenz**
Signaturwerte/-bereiche pro Erz und Methode, mit der in Abschnitt 5 beschriebenen unterschiedlichen
Darstellung Ship- vs. ROC/FPS-Mining.

**Slice 5 — UEX-Sync (Refinery-Yields & Preise)**
Sync-Job + Redis-Caching, UI zeigt Yield/Preis pro Erz inkl. "zuletzt synchronisiert"-Anzeige.

**Slice 6 — Auth & Favoriten**
Login (Discord/Twitch/Google), Location als Favorit speichern/entfernen, Favoriten-Liste im
Nutzerprofil.

**Slice 7 — Community-Korrekturen & Voting**
Einreichen-Formular, Up-/Downvote, Wilson-Score-Berechnung, Status-Badges
(verified/unverified/disputed), Übernahme in Hauptdaten bei erreichtem Schwellwert.

**Slice 8 — Deployment-Pipeline**
`Dockerfile`, `docker-compose.prod.yml`, `Caddyfile`, Cloudflare-Konfiguration (Abschnitt 13),
Deploy-Runbook.

---

## 12. Lokales Setup

`docker-compose.yml` (nur Infrastruktur, App läuft direkt auf dem Host für schnelles HMR):

```yaml
services:
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: ["mongo-data:/data/db"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  mongo-data:
```

`.env.example`:

```
MONGODB_URI=mongodb://localhost:27017/starvein
REDIS_URL=redis://localhost:6379
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=change-me
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
UEX_API_KEY=
UEX_API_BASE_URL=https://uexcorp.space/api
```

Ablauf für neue Entwickler:

```bash
pnpm install
docker compose up -d
cp .env.example .env.local
pnpm seed          # kuratierte Daten einspielen
pnpm dev
pnpm test          # Unit/Integration
pnpm test:e2e       # Playwright
```

---

## 13. Deployment (VPS, Docker, Caddy, Cloudflare)

- `Dockerfile`: Multi-Stage-Build (deps → builder → runner), Next.js mit `output: "standalone"`
  in `next.config.ts` für ein schlankes Runtime-Image.
- `docker-compose.prod.yml`: Services `app`, `mongo` (mit persistentem Volume), `redis`, `caddy`.
  MongoDB läuft für den Start auf dem VPS selbst (Volume-Backup einplanen); Migration zu einem
  Managed-MongoDB später problemlos möglich, da nur `MONGODB_URI` sich ändert.
- `Caddyfile` (Grundgerüst):

```
starvein.example.com {
    reverse_proxy app:3000
    encode gzip zstd
}
```

Caddy übernimmt automatisches TLS per Let's-Encrypt-HTTP-01-Challenge — funktioniert auch hinter
Cloudflares Proxy (orange cloud), da Cloudflare den ACME-Challenge-Pfad durchreicht. Alternative
für mehr Robustheit: `caddy-dns/cloudflare`-Modul für DNS-01-Challenge, dann ist Port 80 nicht
Voraussetzung.

- **Cloudflare:** DNS-Eintrag proxied (orange cloud) für CDN/DDoS-Schutz, SSL-Modus **Full
  (strict)**, Cache Rules für `/_next/static/*` (lange TTL, immutable) und `/api/*` explizit
  **nicht** cachen (dynamische Daten, Redis übernimmt Server-seitiges Caching).

---

## 14. Testing-Strategie im Detail

- **Unit-Tests (Vitest):** reine Funktionen ohne I/O — Wilson-Score-Berechnung, Zod-Validatoren,
  Formatierungs-Helper.
- **Integration-Tests (Vitest + `mongodb-memory-server`):** Repository- und Route-Handler-Tests
  gegen eine echte (In-Memory-)Mongo-Instanz, kein Mocking der DB-Schicht — Vertrauen in echtes
  Query-Verhalten statt in Mock-Annahmen.
- **Component-Tests (React Testing Library):** Interaktionsverhalten einzelner UI-Komponenten,
  keine Netzwerk-Calls (Server-Daten werden als Props injiziert).
- **E2E-Tests (Playwright):** genau ein Happy-Path pro Slice, läuft gegen den Dev-Server mit
  Test-Datenbank (`docker compose -f docker-compose.test.yml`). Ausnahme: der
  Branding-Compliance-Test aus Slice 0 ist kein Happy-Path-Test, sondern ein permanenter
  Regressions-Test und läuft zusätzlich zum jeweiligen Slice-Test immer mit.
- **API-Mocking (MSW):** UEX-API-Antworten in Sync-Job-Tests mocken, damit Tests deterministisch
  und offline lauffähig sind.
- Coverage ist kein Selbstzweck — Ziel ist, dass jede Slice beim nächsten Refactor durch Tests
  abgesichert ist, nicht eine bestimmte Prozentzahl.

---

## 15. Offene Punkte / Out of Scope v1

- Routen-/Fahrtplanung über mehrere Locations (Regolith-Feature, für v2 vormerken).
- Preis-Alerts/Notifications.
- Moderator-Rolle mit erweiterten Rechten (Schema ist vorbereitet, Funktion fehlt).
- Mobile App (PWA-Tauglichkeit als Nebenziel früh mitdenken, aber kein natives App-Ziel).
- Eigene p4k-Datenextraktions-Pipeline (`scunpacked-data`-Ansatz) — v1 verlässt sich auf
  community-gepflegte Datensätze.
- Automatisches Patch-Erkennungssystem (derzeit manuell: neuer `patchVersions`-Eintrag bei
  Mining-relevanten Änderungen).

---

## 16. Quellen & Links

- **RSI Fansite-Policy (bindend, siehe Abschnitt 2):** https://support.robertsspaceindustries.com/hc/en-us/articles/360006895793-Star-Citizen-Fankit-and-Fandom-FAQ
- UEX Corp API 2.0: https://uexcorp.space/api/documentation/
- UEX Mining-Locations-Übersicht: https://uexcorp.space/mining/locations
- Signaturwerte (MIT-Lizenz): https://github.com/Diftic/SC_Signature_Scanner
- Signatur-Rechner-Referenz: https://github.com/RainbowRamen/sc-mining-hud
- Verwandtes Projekt (Inspiration, keine Datenquelle): https://github.com/SeekND/Strata
- Rohdaten-Extraktion (für spätere Eigenentwicklung): https://github.com/StarCitizenWiki/scunpacked-data
- Regolith.rocks Abschaltungs-Ankündigung (Referenz für Funktionsumfang): https://regolith.rocks/
