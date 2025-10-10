# Gold Shore Labs

Empowering communities through secure, scalable, and intelligent infrastructure.
💻 Building tools in Cybersecurity, Cloud, and Automation.
🌐 Visit us at [GoldShoreLabs](https://goldshore.org) — compatible with [goldshore.foundation](https://goldshore.foundation)

## Repository overview

- [`index.html`](index.html) powers the public landing page and wires up Tailwind via CDN, Swiper-powered hero imagery, and the section layout for services, work, team, and contact CTAs.
- [`assets/css/styles.css`](assets/css/styles.css) adds bespoke polish on top of Tailwind (pricing toggle, testimonial glassmorphism, and accessible FAQ toggles).
- [`src/router.js`](src/router.js) is the Cloudflare Worker entry point that proxies static assets to the configured Pages origin while breaking `/api/gpt` traffic out to the API handler.
- [`src/gpt-handler.js`](src/gpt-handler.js) validates authenticated chat requests, enforces CORS, normalises payloads, and relays them to OpenAI's Chat Completions endpoint.
- [`docs/`](docs) collects internal operations notes (Cloudflare Access, implementation guides, etc.) and is the best place to append additional runbooks.

## Frontend (goldshore.org)

The landing page is a static document served from Cloudflare Pages. Tailwind is sourced from the official CDN, and Swiper is used for lightweight hero carousels so the bundle stays minimal while still supporting accessible motion controls. Key interactive elements include:

- A sticky navigation bar with mobile toggle logic inlined in `index.html`, keeping the DOM small for fast first paint.
- Hero imagery rendered through Swiper slides with pagination controls, giving the brand's "Shaping waves" story a dynamic marquee.
- Clickable "What we deliver" cards that blend gradient overlays with subtle scale transforms from Tailwind utility classes.
- Services, team, and contact sections arranged as semantic sections so screen readers can jump between anchors exposed in the nav.

Tailwind handles most theming, but the custom stylesheet introduces affordances Tailwind does not cover out of the box:

- `.pricing-toggle` switches adopt pill styling, focus-visible rings, and drop shadows to communicate the active state.
- `.testimonial-card` applies a glass blur backdrop, increased padding above medium breakpoints, and consistent FAQ paddings.
- `.faq-question` and `.faq-icon` form an accessible disclosure pattern that uses pseudo-elements to animate the plus/minus indicator while respecting keyboard focus.

## Cloudflare Worker architecture

Traffic for `goldshore.org` hits a Worker (`wrangler.toml` target `goldshore`) before being proxied to the static Pages host. The Worker layer does two jobs:

1. **Asset routing** — `src/router.js` picks the correct origin based on environment variables such as `ASSETS_ORIGIN` or `PRODUCTION_ASSETS`, rewrites the incoming request, and forwards it with cache hints so CDN hits stay warm. Requests to `/api/gpt` short-circuit to the API handler instead of the Pages origin.
2. **GPT proxy** — `src/gpt-handler.js` exposes a locked-down `POST /api/gpt` endpoint. It enforces CORS allowlists, bearer authentication via the `GPT_SHARED_SECRET`, validates supported model names, normalises `messages` arrays, and forwards the payload to OpenAI using the Worker’s `OPENAI_API_KEY`. Errors bubble back with JSON bodies and matching HTTP status codes so clients can react precisely.

### Required secrets and configuration

Set the following per environment using `wrangler secret put` (or provider-specific secret managers):

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Authorises the Worker when calling OpenAI's Responses API. |
| `GPT_SHARED_SECRET` | Bearer token browsers must send when requesting `/api/gpt`. |
| `GPT_ALLOWED_ORIGINS` | Comma-separated origins that receive permissive CORS headers. |
| `CF_ACCESS_AUD` / `CF_ACCESS_ISS` / `CF_ACCESS_JWKS_URL` (optional) | Lock API access behind Cloudflare Zero Trust when required. |
| `FORMSPREE_ENDPOINT` | Submission URL for the contact form backend. |
| `TURNSTILE_SECRET` | Server-side secret for Cloudflare Turnstile verification. |

Use `.dev.vars` (ignored by git) to store throwaway credentials for local previews.

## Keeping `main` in sync

Gold Shore deploys directly from `main`, so contributors should keep their local clone fast-forwarded and push only from that branch.

### One-time setup

```bash
git checkout main
git branch --set-upstream-to=origin/main main
```

### Daily workflow

```bash
# Update local tracking info and fast-forward main
git fetch origin main
git pull --ff-only

# Work, commit, then push straight back to main
git push origin main
```

### Automated helper

For a repeatable routine, run the repository script before and after you commit:

```bash
./scripts/sync-main.sh        # fast-forward local main
./scripts/sync-main.sh --push # push your latest commits
```

The helper ensures you are on `main`, aligns the upstream remote, fast-forwards from the specified remote (default `origin`), and optionally pushes back up. Override the remote or branch with `--remote` / `--branch` if you are mirroring another deployment target.

---

For guidance on broader operational topics (analytics, exit plans, or worker-specific runbooks) explore the documents under [`docs/`](docs) and [`GOLDSHORE_IMPLEMENTATION_GUIDE.md`](GOLDSHORE_IMPLEMENTATION_GUIDE.md).
