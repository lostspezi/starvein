# Contributing to STARVEIN

Thanks for helping keep the Star Citizen mining reference alive! This guide covers
how to report issues, propose changes and get a pull request merged.

## Reporting bugs & requesting features

- **Bug?** [Open a bug report](https://github.com/lostspezi/starvein/issues/new?template=bug_report.yml) —
  include the affected page, your browser and the Star Citizen patch version the
  data refers to.
- **Idea?** [Open a feature request](https://github.com/lostspezi/starvein/issues/new?template=feature_request.yml).
- **Wrong mining data** (probabilities, signatures)? Prefer the in-app community
  correction flow (submit + vote) — that's what it's for. Open an issue only for
  systematic data problems (e.g. a broken sync or seed).

Please search existing issues first to avoid duplicates.

## Development setup

See the [Getting started](README.md#getting-started) section of the README.
Short version: Node 24, pnpm 11, `docker compose up -d`, `pnpm seed`, `pnpm dev`.

## How we work

### Vertical slices

One feature = one folder under `src/features/<feature>/` containing UI, route
handlers, repository, schema and all of its tests. Shared code lives in `src/lib/`
and is the exception, not the rule. Don't introduce global `services/`/`models/`
layers.

### Test-driven development (required)

Every production change starts with a failing test:

1. **Red** — write a unit/integration test for the next thin slice.
2. **Green** — implement the minimum to pass.
3. **Refactor** — clean up while staying green.

- Repository and route-handler tests run against a real in-memory MongoDB
  (`mongodb-memory-server`) — don't mock the DB layer.
- Component tests use React Testing Library; server data is injected as props.
- Each user-facing feature gets one Playwright happy-path test in `e2e/`.
- External APIs (UEX) are mocked with MSW (`src/test/uex-server.ts`).

### i18n

Every UI string must exist in **both** locales (`de` and `en`) in the feature's
`messages/` folder — no hardcoded strings, not even "just for now". Game terms
(ore names, locations, ships) stay untranslated.

### Design system

Before touching UI, read [`design-system/MASTER.md`](design-system/MASTER.md).
Use the existing design tokens and primitives — no new inline hex colors, no new
animation/icon libraries.

## Non-negotiable rules (RSI fansite policy)

STARVEIN exists at the tolerance of Cloud Imperium Games' fansite policy. These
rules bind every contribution and are enforced by a permanent Playwright test
(`e2e/branding-compliance.spec.ts`):

- The verbatim English fansite disclaimer and the link to
  robertsspaceindustries.com must stay visible on every page (rendered by
  `src/lib/components/SiteFooter.tsx`).
- Never delete, skip or weaken `e2e/branding-compliance.spec.ts` — not even
  temporarily.
- No copyrighted game content (lore texts, artwork, in-game screenshots).
  Ore names, numbers and probabilities are facts and fine.
- Browsing must stay free and account-less; no paywalls, no forced registration.

PRs that violate these rules will not be merged, regardless of technical quality.

## Pull requests

1. Fork the repo and create a feature branch off `main`
   (e.g. `feat/ore-detail-chart` or `fix/price-sync-timeout`).
2. Follow TDD (see above) and keep the change focused — one concern per PR.
3. Make sure everything is green locally:

   ```bash
   pnpm lint && pnpm test && pnpm test:e2e
   ```

4. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit
   messages and the PR title, e.g. `feat(ores): add rarity filter` or
   `fix(sync): handle empty UEX price response`.
5. Open the PR against `main` and fill in the PR template. Screenshots are
   appreciated for UI changes.

Husky + lint-staged will auto-format staged files on commit.

### CI checks (required to merge)

Every pull request runs through GitHub Actions; all checks must be green before
a merge is possible:

| Check               | Local equivalent    | What it verifies                                                |
| ------------------- | ------------------- | --------------------------------------------------------------- |
| `lint`              | `pnpm lint`         | ESLint (Next.js core-web-vitals + TypeScript rules)             |
| `format`            | `pnpm format:check` | Prettier formatting                                             |
| `typecheck`         | `pnpm typecheck`    | TypeScript compiles without errors                              |
| `jsdoc`             | `pnpm lint:jsdoc`   | existing JSDoc comments are valid and match signatures          |
| `test`              | `pnpm test`         | Vitest unit + integration suite                                 |
| `e2e`               | `pnpm test:e2e`     | production build + Playwright suite (incl. branding compliance) |
| `dependency-review` | —                   | no known-vulnerable or license-incompatible dependencies        |

CodeQL security scanning runs alongside these and reports findings under the
repository's Security tab.

## Code of conduct

Be excellent to each other — see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
