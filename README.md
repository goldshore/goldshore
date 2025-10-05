# GoldShore Monorepo

This repository hosts the GoldShore marketing site, Cloudflare Worker router, shared packages, and automation workflows. The structure keeps each concern isolated while still benefiting from a single workspace for dependency management.

```
.
├─ apps/
│  ├─ web/          # Astro site (static output)
│  └─ api-router/   # Cloudflare Worker router
├─ packages/
│  ├─ theme/        # Shared styling primitives
│  ├─ ai-maint/     # AI maintenance tooling (Node)
│  └─ db/           # D1 schema and drizzle helpers
├─ infra/
│  ├─ scripts/      # DNS + Access automation
│  └─ access/       # Access configuration JSON
├─ .github/workflows
└─ wrangler.toml
```

## Getting started

1. Install dependencies from the repo root:
   ```bash
   npm install
   ```
2. Start the Astro dev server:
   ```bash
   npm run dev --workspace apps/web
   ```
3. Run the image pipeline before committing new assets:
   ```bash
   npm run process:images --workspace apps/web
   ```

## Deployments

Deployments are handled by **.github/workflows/deploy.yml** whenever `main` changes or when triggered manually. The workflow:
- installs workspace dependencies,
- runs the image optimization script,
- builds the Astro site,
- deploys the Worker to `production`, `preview`, and `dev` environments,
- reconciles Cloudflare Access apps, and
- syncs DNS records for `goldshore.org` hosts.

Required repository secrets:

| Secret | Purpose |
| --- | --- |
| `CF_ACCOUNT_ID` | Cloudflare account containing the Worker and Access apps |
| `CF_API_TOKEN` | Token with Workers, Pages, DNS, and Access permissions |
| `CF_SECRET_STORE_ID` | Cloudflare Secrets Store identifier |
| `CF_ZONE_ID` | Zone ID for `goldshore.org` (used by DNS sync job) |
| `OPENAI_API_KEY` | Access token for AI maintenance tasks |
| `OPENAI_PROJECT_ID` | Associated OpenAI project identifier |

## AI maintenance

The scheduled **AI maintenance (safe)** workflow lint checks Astro/CSS assets, runs Lighthouse in a static smoke mode, and—when eligible—opens a pull request with conservative copy fixes. Extend `packages/ai-maint` with richer tooling when you are ready to involve external APIs.

## Database

`packages/db/schema.sql` defines the foundational Cloudflare D1 tables for blog posts and store products. Bind the database in `wrangler.toml` by replacing `REPLACE_WITH_D1_ID` with your provisioned database ID.

## Infrastructure scripts

- `infra/scripts/upsert-goldshore-dns.sh` keeps the core DNS records up to date. It requires `CF_API_TOKEN` and either `CF_ZONE_ID` or a resolvable `ZONE_NAME`.
- `infra/scripts/rebuild-goldshore-access.sh` replays the Access configuration stored in `infra/access/applications.json`.

Both scripts are safe to run repeatedly; they will create or update records and policies as needed.
