# STARVEIN

[![CI](https://github.com/lostspezi/starvein/actions/workflows/ci.yml/badge.svg)](https://github.com/lostspezi/starvein/actions/workflows/ci.yml)

**Community mining reference for Star Citizen** — where each ore spawns, with what
probability, and what scan signature to look for. Covers ship mining (Prospector/MOLE),
ROC and FPS hand mining, plus refinery yields, sell prices and community-built
mining loadouts.

**Live app: [starvein.app](https://starvein.app)**

STARVEIN fills the gap left by [regolith.rocks](https://regolith.rocks/) (shut down
June 2026) as an open-source project the community keeps up to date itself.

## Features

- **Ore reference** — all mineable ores with rarity, category and base values
- **Location browser** — star systems → celestial bodies → mining locations
- **Occurrences & probability** — per ore and mining method (ship / ROC / FPS)
- **Scan signature reference** — method-aware: ship signatures identify the mineral,
  ROC/FPS signatures only indicate deposit size
- **Refinery yields & prices** — synced from the [UEX Corp API](https://uexcorp.space/)
- **Community corrections** — wiki-style submissions with Wilson-score voting
- **Mining loadouts** — build, share and vote on ship/vehicle loadouts with live
  equipment prices
- **Bilingual** — English and German, no account required for browsing

## Tech stack

Next.js 16 (App Router) · TypeScript · MongoDB · Redis · Tailwind CSS v4 ·
next-intl · Better Auth · Vitest + Playwright · pnpm

## Getting started

Prerequisites: Node.js 24 LTS, pnpm 11, Docker (for MongoDB + Redis).

```bash
pnpm install
docker compose up -d        # MongoDB + Redis
cp .env.example .env.local  # fill in what you need (see below)
pnpm seed                   # load curated reference data
pnpm dev                    # http://localhost:3000
```

Sign-in (Discord/Twitch/Google OAuth) and UEX price sync are optional for local
development — the reference data works without any credentials in `.env.local`.

### Scripts

| Command         | What it does                                    |
| --------------- | ----------------------------------------------- |
| `pnpm dev`      | dev server on :3000                             |
| `pnpm test`     | unit + integration tests (Vitest)               |
| `pnpm test:e2e` | Playwright e2e suite (builds + serves on :3100) |
| `pnpm lint`     | ESLint                                          |
| `pnpm seed`     | seed curated data into MongoDB                  |
| `pnpm sync:uex` | pull prices/yields from the UEX API             |

## Contributing

Contributions are very welcome — bug reports, data corrections, translations and
code. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow (TDD,
vertical slices, conventional commits) and the non-negotiable fansite-policy
rules. Found a bug or have an idea? [Open an issue](https://github.com/lostspezi/starvein/issues/new/choose).

Data sources and attributions are listed in [CREDITS.md](CREDITS.md).

## License

[MIT](LICENSE) © lostspezi — crafted with ♥ live on [twitch.tv/lostspezi](https://www.twitch.tv/lostspezi).

---

> This is an unofficial Star Citizen fansite, not affiliated with the Cloud Imperium
> group of companies. All content on this site not authored by its host or users are
> property of their respective owners.

Official Star Citizen website: [robertsspaceindustries.com](https://robertsspaceindustries.com)
