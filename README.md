# Gold Shore monorepo

This repository follows the Gold Shore agent playbook: a lightweight monorepo that keeps the Astro site, Cloudflare Worker, and
infrastructure scripts in one place so the CI agent can ship predictable deployments.

## Layout

```
goldshore/
├─ apps/
│  ├─ api-router/      # Cloudflare Worker router
│  └─ web/             # Astro marketing site
├─ packages/
│  └─ image-tools/     # Sharp image optimisation script
├─ infra/
│  └─ scripts/             # DNS & Access automation
├─ .github/workflows/      # Deploy / maintenance CI
├─ wrangler.toml           # Cloudflare Pages configuration
├─ wrangler.worker.toml    # Worker + bindings configuration
└─ package.json            # npm workspaces + shared tooling
```

### Key files

- `apps/web/src/styles/theme.css` — colour tokens and shared UI utilities.
- `apps/web/src/components/Header.astro` — responsive header with desktop nav and mobile affordance.
- `apps/web/src/components/Hero.astro` — animated “glinting” skyline hero that respects reduced motion preferences.
- `apps/api-router/src/router.ts` — Worker proxy that selects the correct Cloudflare Pages origin per hostname.
- `infra/scripts/upsert-goldshore-dns.sh` — idempotent DNS upsert script for `goldshore.org` and preview/dev subdomains.

For a deeper end-to-end deployment reference, read [GoldShore Implementation Guide](./GOLDSHORE_IMPLEMENTATION_GUIDE.md).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Astro dev server from `apps/web`. |
| `npm run build` | Optimise images then build the production site. |
| `npm run deploy:prod` | Deploy the Worker to the production environment. |
| `npm run deploy:preview` | Deploy the Worker to the preview environment. |
| `npm run deploy:dev` | Deploy the Worker to the dev environment. |
| `npm run qa` | Execute the local QA helper defined in `.github/workflows/local-qa.mjs`. |

## GitHub Actions

- `.github/workflows/deploy.yml` builds the site, deploys the Worker to production, and upserts DNS on pushes to `main` or manual runs.
- `.github/workflows/qa.yml` enforces Lighthouse performance/accessibility/SEO scores ≥ 0.90 on pull requests.

## Secrets required in CI

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start Astro locally:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```
3. Deploy the Worker preview when ready:
   ```bash
   npx wrangler dev --config wrangler.worker.toml
   ```

- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

If either secret is missing the deploy workflow will fail early, prompting the operator to add them before proceeding.

Provision a Cloudflare D1 database named `goldshore-db`. When you're ready to wire it to the Worker, add a `[[d1_databases]]` block to `wrangler.worker.toml` (an example is shown below) and replace `DATABASE_ID` with the value from the Cloudflare dashboard. Initial seed tables can be created by running:

The Worker expects Cloudflare Pages projects mapped to:

Example Worker binding block:

```toml
[[d1_databases]]
binding = "DB"
database_name = "goldshore-db"
database_id = "DATABASE_ID"
```

Future Drizzle integration can live in `packages/db` alongside the schema.

The DNS upsert script keeps these hostnames pointed at the correct Pages project using proxied CNAME records for:
`goldshore.org`, `www.goldshore.org`, `preview.goldshore.org`, and `dev.goldshore.org`.

- The Worker deploy relies on the Cloudflare Secrets Store; be sure the store already contains the mapped secrets (`OPENAI_API_KEY`, `OPENAI_PROJECT_ID`, `CF_API_TOKEN`).
- Worker-related commands (including the GitHub Actions deploy workflow) should pass `--config wrangler.worker.toml` so they continue to load bindings and routes, while Cloudflare Pages reads the root `wrangler.toml` for its build output directory.
- Cloudflare Access automation defaults to allowing `@goldshore.org` addresses. Adjust `ALLOWED_DOMAIN` when running the script if your allowlist differs.
- The AI maintenance workflow is conservative and only opens pull requests when copy changes are suggested. Merge decisions stay in human hands.
