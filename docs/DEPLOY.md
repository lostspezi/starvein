# Deployment (VPS, Docker, Caddy)

Production runs on a single Linux VPS with Docker. Continuous Deployment:
every push to `main` that passes the full CI pipeline triggers
[deploy.yml](../.github/workflows/deploy.yml), which

1. builds the app image (`ghcr.io/lostspezi/starvein`) and the jobs image
   (`ghcr.io/lostspezi/starvein-jobs`, used for seed/sync one-offs) and pushes
   both to GHCR,
2. copies `docker-compose.prod.yml` + `Caddyfile` to `/opt/starvein` on the VPS,
3. pulls the new images and restarts the stack,
4. re-seeds the curated data (idempotent upserts),
5. verifies `/api/health` inside the app container.

The stack (see [docker-compose.prod.yml](../docker-compose.prod.yml)):
`app` (Next.js standalone, :3000 internal) · `mongo` (persistent volume)
· `redis` · `caddy` (ports 80/443, automatic Let's Encrypt TLS)
· `jobs` (profile-only, for one-off commands).

## One-time setup

### 1. DNS

Point the domain at the VPS **before** the first deploy so Caddy can obtain
certificates:

| Type | Name  | Value        |
| ---- | ----- | ------------ |
| A    | `@`   | `<VPS-IPv4>` |
| A    | `www` | `<VPS-IPv4>` |

(Optional later: put Cloudflare in front — proxied records, SSL mode
**Full (strict)**, cache `/_next/static/*` long, never cache `/api/*`. See
[Security & edge hardening](#security--edge-hardening) for the rate-limit/WAF
rules that make the open reference APIs abuse-resistant.)

### 2. VPS directory and environment

```bash
sudo mkdir -p /opt/starvein && sudo chown "$USER" /opt/starvein
cat > /opt/starvein/.env <<EOF
BETTER_AUTH_URL=https://starvein.app
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
SYNC_SECRET=$(openssl rand -base64 24)
UEX_API_BASE_URL=https://api.uexcorp.space/2.0
UEX_API_KEY=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
EOF
chmod 600 /opt/starvein/.env
```

`MONGODB_URI`/`REDIS_URL` are set by compose (service-internal hostnames).
Fill in the Discord OAuth credentials (callback
`https://starvein.app/api/auth/callback/discord`) and the UEX API key when
available — the reference works without them; only login and price sync stay
disabled.

### 3. Deploy key + GitHub secrets

Generate a dedicated deploy key **on the VPS** and authorize it:

```bash
ssh-keygen -t ed25519 -f ~/starvein-deploy -N "" -C "starvein-deploy"
cat ~/starvein-deploy.pub >> ~/.ssh/authorized_keys
```

Then, from any machine with `gh` logged in, set the repository secrets
(paste the **private** key file for `VPS_SSH_KEY`):

```bash
gh secret set VPS_HOST --body "<vps ip or hostname>"
gh secret set VPS_USER --body "<ssh user>"
gh secret set VPS_SSH_KEY < ~/starvein-deploy   # private key
```

Afterwards delete `~/starvein-deploy` from the VPS (the public half in
`authorized_keys` is all it needs).

### 4. Image visibility

The GHCR packages `starvein` and `starvein-jobs` must be **public** so the VPS
can pull without credentials: after the first deploy run, open each package on
GitHub (Profile → Packages) → Package settings → Change visibility → Public.

## Operating

- **Deploy:** push to `main` (CI must be green) or trigger "Deploy" manually in
  the Actions tab.
- **Logs:** `docker compose -f /opt/starvein/docker-compose.prod.yml logs -f app`
- **UEX price sync (cron on the VPS):** must go through the API route — the
  route invalidates the Next.js data cache and the ISR pages after a
  successful sync (`revalidateAfterSync`). Running the tsx script instead
  bypasses the app process, so pages would serve stale data until their
  revalidate TTL expires:

  ```
  */30 * * * * s=$(grep -m1 "^SYNC_SECRET=" /opt/starvein/.env | cut -d= -f2-); echo "$(date -Is) sync-uex: $(curl -sS --max-time 900 --resolve starvein.app:443:127.0.0.1 -X POST https://starvein.app/api/sync-uex -H "x-sync-secret: $s" 2>&1)" >> /var/log/starvein-sync.log
  ```

  (`--resolve …:127.0.0.1` geht direkt auf Caddy, vorbei an Cloudflare —
  unabhängig von Bot-Regeln.)

- **SC-Wiki sync (cron on the VPS):** Erze, Locations, Vorkommen,
  Signaturwerte, Blueprints und der Materialkatalog kommen ausschließlich aus
  diesem Sync — ohne ihn sind Referenz, `/blueprints` und `/materials` leer
  (der Seed liefert nur Sternsysteme, Signatur-Fallbacks und Equipment).
  Achtung: Der erste Lauf entfernt alte kuratierte/community-Occurrence-Rows
  (die Collections sind vollständig wiki-geführt, Prune bei jedem Sync).
  Die Daten ändern sich nur mit einem Game-Patch, täglich reicht — ebenfalls
  über die Route (Cache-Invalidierung, siehe oben):

  ```
  17 4 * * * s=$(grep -m1 "^SYNC_SECRET=" /opt/starvein/.env | cut -d= -f2-); echo "$(date -Is) sync-wiki: $(curl -sS --max-time 1800 --resolve starvein.app:443:127.0.0.1 -X POST https://starvein.app/api/sync-wiki -H "x-sync-secret: $s" 2>&1)" >> /var/log/starvein-sync.log
  ```

  Beide Routen sind fail closed (401 ohne konfiguriertes/korrektes
  `SYNC_SECRET`). Die tsx-Skripte (`pnpm sync:uex`, `pnpm sync:wiki`) bleiben
  für lokale Läufe und One-offs über den `jobs`-Container erhalten.

- **Manual seed:** `docker compose -f docker-compose.prod.yml run --rm jobs`
- **Achtung `jobs`-Image:** Der `jobs`-Service steht hinter `profiles: ["jobs"]`.
  Ein blankes `docker compose pull` überspringt ihn, und `run` zieht nur, wenn
  gar kein Image da ist — ohne `--profile jobs pull` laufen Seed und Sync also
  gegen veralteten Code. Der Deploy-Workflow macht das; bei Handarbeit auf dem
  VPS vorher `docker compose -f docker-compose.prod.yml --profile jobs pull`.
- **Mongo backup:** the data lives in the `starvein_mongo-data` volume;
  `docker compose -f docker-compose.prod.yml exec mongo mongodump --archive` piped
  to a dated file is the minimal backup. Schedule it before relying on
  user-generated data (favorites, loadouts, guides).

## Security & edge hardening

STARVEIN exposes intentionally open, unauthenticated read APIs (`/api/ores`,
`/api/search`, `/api/guides`, `/api/price-ticker`, …). Defense in depth: the
**edge (Cloudflare) is the primary brake** against abuse/DoS — blocking there
costs no Node/Mongo resources — and the app carries backstops in case the origin
is hit directly (past Cloudflare).

### Cloudflare (edge — primary defense)

With the domain proxied (orange cloud), add in the dashboard:

- **Rate limiting rule** (Security → WAF → Rate limiting rules):
  - `/api/*` → **10 requests / 10 s per IP** (≈ 60/min), action _Block_ for the
    window. Covers all API endpoints including `/api/auth/*`. This is the current
    live rule on starvein.app.
  - **Free-plan constraints** (what the current zone actually allows): exactly
    **one** rate-limiting rule per zone; `period` is fixed to **10 s**; counting
    happens at the colocation level, so `cf.colo.id` is a required characteristic
    (the rule counts per IP _and_ data center, not purely per IP). That is why the
    two-rule design below (separate stricter `/api/auth/*`) is not deployed —
    login/OAuth brute-force is instead covered by the broad `/api/*` rule plus
    Better Auth's own rate limiter (which now sees the real client IP via
    `advanced.ipAddress.ipAddressHeaders`).
  - **On Pro or higher**, add the intended two-rule setup: keep `/api/*` at
    ~60/min and prepend a stricter `/api/auth/*` at **10 requests / minute per
    IP**, with longer periods, true per-IP counting and _Managed Challenge_ as an
    option.
- **WAF Managed Rules** enabled; **Bot Fight Mode** on to deter scrapers.
- **Cache rules:** cache `/_next/static/*` long/immutable; **cache the dynamic
  OG images** (`/*/opengraph-image*`) with a sensible TTL (they are per-slug
  ISR-rendered, so they are safe to cache and expensive to regenerate); **never
  cache `/api/*`** (dynamic; Redis/Next handle server-side caching).
- SSL/TLS mode **Full (strict)** so Cloudflare ↔ Caddy stays encrypted.

Note: the sync crons use `--resolve …:127.0.0.1` to reach Caddy directly, so the
rate-limit/WAF rules above never interfere with them.

### App-level backstops (already in code)

- **Read rate limit** on the open JSON endpoints (`src/lib/read-rate-limit.ts`),
  keyed by `cf-connecting-ip`. **Fail-open**: if Redis is unreachable the limit
  does not block (a Redis outage must not take the public reference down) — this
  is why the Cloudflare rule above is the primary brake, not optional.
- **Security headers** set in `next.config.ts` (`src/lib/security-headers.ts`,
  incl. a production CSP) and at Caddy (HSTS). Verify after deploy with
  `curl -sI https://starvein.app` and a scan on
  [securityheaders.com](https://securityheaders.com) / Mozilla Observatory.
- **Sync endpoints** are fail-closed with a timing-safe secret compare
  (`src/lib/sync-auth.ts`).
- **Env validation** at boot (`src/lib/env.ts` via `src/instrumentation.ts`)
  rejects missing/placeholder secrets in production — a misconfigured container
  fails fast instead of running insecurely.
- **Better Auth** resolves the real client IP behind Cloudflare
  (`advanced.ipAddress.ipAddressHeaders`) and enforces `trustedOrigins`
  (extend via `BETTER_AUTH_TRUSTED_ORIGINS`). Its rate limiter uses the default
  in-memory store — fine for the single-instance VPS; switch to a shared store
  (`secondaryStorage`/database) if scaling to multiple app replicas.
- **Outbound calls** to UEX/SC-Wiki have a request timeout + response size cap
  (`src/lib/safe-fetch.ts`) so a slow/huge upstream can't hang or OOM a sync.
