# SEO ops checklist (non-code steps)

Companion to the SEO upgrade shipped on `feat/seo-2026` (OG images, JSON-LD,
sitemap coverage, ISR caching, content depth). Everything in this file happens
outside the repo — Cloudflare dashboard, Search Console, VPS crontab — and is
ordered by impact. Items 1 and 5 are prerequisites for features already in the
code.

## 1. Unblock link-preview bots (prerequisite for OG images)

Cloudflare currently answers non-browser user agents with **403** (bot fight
mode). That blocks the unfurl bots of Discord, X and friends, so the newly
generated Open Graph images never render in shares.

- In Cloudflare: **Security → Bots** — replace Bot Fight Mode with targeted
  rules, or allow the "Verified Bots" category.
- Verify afterwards (all must return 200):

  ```bash
  for ua in "Discordbot/2.0" "Twitterbot/1.0" "Slackbot-LinkExpanding" "TelegramBot" "WhatsApp/2.0" "facebookexternalhit/1.1"; do
    curl -s -o /dev/null -w "%s -> %{http_code}\n" -A "$ua" https://starvein.app/en/ores/quan
  done
  curl -s -o /dev/null -w "og-image -> %{http_code}\n" -A "Discordbot/2.0" https://starvein.app/en/ores/quan/opengraph-image
  ```

## 2. AI-crawler policy (decision made: answer engines yes, training no)

The Cloudflare-managed robots.txt currently blocks **all** AI crawlers.
Decision from 2026-07-17: allow answer/search engines (citations link back to
the site — real referral traffic in 2026), keep blocking training crawlers.

- **Allow** (Cloudflare → Security → Bots → AI crawlers, or robots.txt
  overrides): `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Applebot`.
- **Keep blocking**: `GPTBot`, `CCBot`, `Google-Extended`, `Bytespider`,
  `meta-externalagent`, `Applebot-Extended`.
- Keep the managed `Content-Signal: search=yes, ai-train=no` line.
- Google Search and AI Overviews use the regular `Googlebot` and are
  unaffected either way.

## 3. Cloudflare cache rules

- Confirm the long-TTL/immutable rule for `/_next/static/*`.
- Optional (after the ISR release is live): add a Cache Rule that makes the
  reference paths (`/*/ores/*`, `/*/locations/*`, `/*/materials/*`,
  `/*/blueprints/*`) _eligible for cache_ so the edge honors the origin's
  `s-maxage=3600`. Cloudflare does not cache HTML by default; origin-side ISR
  already carries most of the win if you skip this.
- Never cache `/api/*` or the noindex paths (favorites, warehouse, admin, …).

## 4. Search Console & Bing Webmaster

- Verify `starvein.app` via DNS TXT record (no code change needed).
- Submit `https://starvein.app/sitemap.xml` (now ~5,800 URLs including
  guides, ships, materials and blueprints).
- Watch index coverage per section over the first weeks — especially whether
  the ~3,100 blueprint pages earn impressions or should be pruned later.

## 5. Switch the VPS sync cron to the API routes — DONE (2026-07-17)

The tsx-script cron ran **outside the app process** and could never
invalidate the Next.js data cache or the ISR pages. The crontab now calls the
API routes via `curl --resolve starvein.app:443:127.0.0.1` (bypasses
Cloudflare, immune to bot rules) with the secret read from
`/opt/starvein/.env`; verified end-to-end against `/api/sync-uex`. Backup of
the old crontab: `/root/crontab.backup-2026-07-17`. Reference lines in
[DEPLOY.md](DEPLOY.md).

## 6. Optional: persist the ISR cache across container restarts

ISR entries live in `.next/cache` inside the standalone app container and are
lost on restart (pages simply regenerate on demand — acceptable). To keep
them, mount a volume for `/app/.next/cache` in `docker-compose.prod.yml`.

## 7. Post-deploy validation

- `curl -sI https://starvein.app/en/ores/quan | grep -i cache-control` →
  expect `s-maxage=3600` (via Cloudflare: check `cf-cache-status` once a
  cache rule from item 3 exists).
- Rich results test / schema validator on an ore page (BreadcrumbList) and a
  public guide (Article).
- Share an ore link in Discord and check the generated preview card.
- After a sync cron run: spot-check that an ore page shows the new price
  data without waiting an hour.
