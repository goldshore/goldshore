# Cloudflare Deployment Playbook

This project can run as a static site (GitHub Pages, Cloudflare Pages, or any CDN) while a Cloudflare Worker handles smart routing and custom-domain protection. Use the following checklist to keep `goldshore.org` serving production traffic without burning Worker invocations on preview branches.

## 1. Static origin

1. Build the site from `main` and publish it to your preferred static host. For Cloudflare Pages, set the project to deploy from this repository.
2. Note the origin hostnames that Cloudflare assigns:
   - **Production** – e.g. `goldshore-org.pages.dev`
   - **Preview** – e.g. `<branch>.goldshore-org.pages.dev`

These origin domains stay on the free tier and do not incur Worker usage.

## 2. Worker configuration

The Worker in `src/router.js` proxies requests to the appropriate origin. Configure its environment variables with Wrangler so only production traffic touches the Worker.

```bash
# Preview (runs on *.workers.dev)
wrangler deploy --env preview \
  --var PRODUCTION_ORIGIN="https://goldshore-org.pages.dev"

# Production (mapped to the apex + www)
wrangler deploy --env production \
  --var PRODUCTION_ORIGIN="https://goldshore-org.pages.dev" \
  --var PREVIEW_ORIGIN="https://goldshore-org.pages.dev"
```

- `PRODUCTION_ORIGIN` should point at the static site that already renders the full experience.
- `PREVIEW_ORIGIN` is optional. If you leave it blank, previews fall back to the production build.
- `CACHE_TTL` (default `300` seconds) keeps the Worker cost low by letting Cloudflare cache responses.

## 3. Split deployments

1. Point `goldshore.org` and `www.goldshore.org` DNS records at Cloudflare (orange cloud = proxy).
2. In the Workers Routes UI, assign the **production** environment to `goldshore.org/*` and `www.goldshore.org/*`. The preview environment stays on the default `router.<account>.workers.dev` URL so it does not intercept live traffic.
3. For Cloudflare Pages, ensure the custom domain is attached only to the production deployment. Preview links continue to use the auto-generated `*.pages.dev` hostname.

This split keeps Git branches and preview deploys from colliding with the live domain. The Worker simply shields the domain and rewrites upstream traffic while Pages handles the heavy lifting.

## 4. Cost controls

- The Worker runs only on the production routes you assign. Leave preview testing to the free Pages domain.
- Remove any unused wildcard routes (e.g. other domains) if you no longer serve content there—each request would count toward the Worker quota.
- Monitor analytics with the `GOLD_ANALYTICS` dataset; it is already defined in `wrangler.toml`.

With this layout, Cloudflare Pages delivers the site, Workers protects the domain, and billing stays predictable.
