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
**Full (strict)**, cache `/_next/static/*` long, never cache `/api/*`.)

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
  */30 * * * * curl -sf -X POST https://starvein.app/api/sync-uex -H "x-sync-secret: $(grep ^SYNC_SECRET= /opt/starvein/.env | cut -d= -f2)" >> /var/log/starvein-sync.log 2>&1
  ```

- **SC-Wiki sync (cron on the VPS):** Erze, Locations, Vorkommen,
  Signaturwerte, Blueprints und der Materialkatalog kommen ausschließlich aus
  diesem Sync — ohne ihn sind Referenz, `/blueprints` und `/materials` leer
  (der Seed liefert nur Sternsysteme, Signatur-Fallbacks und Equipment).
  Achtung: Der erste Lauf entfernt alte kuratierte/community-Occurrence-Rows
  (die Collections sind vollständig wiki-geführt, Prune bei jedem Sync).
  Die Daten ändern sich nur mit einem Game-Patch, täglich reicht — ebenfalls
  über die Route (Cache-Invalidierung, siehe oben):

  ```
  17 4 * * * curl -sf -X POST https://starvein.app/api/sync-wiki -H "x-sync-secret: $(grep ^SYNC_SECRET= /opt/starvein/.env | cut -d= -f2)" >> /var/log/starvein-sync.log 2>&1
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
