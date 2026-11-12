# c3nsor

Website and Chrome extension for **c3nsor**, which shows people what a site’s privacy policy says about their data before they sign up.

| Folder                     | What it is                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| [`docs/`](docs/)           | GitHub Pages site: home, Extension page, **Try it** web demo, privacy policy              |
| [`extension/`](extension/) | Chrome MV3 extension (rules-based, local analysis). See its [README](extension/README.md) |
| [`proxy/`](proxy/)         | Cloudflare Worker that lets the web demo download policy pages for live URL analysis      |
| [`testing/`](testing/)     | User-testing kit for the MVP (metrics, session script, survey, report template)           |

## Development

New developers start with the [Tech Employee Playbook](https://michael-peterson.com/c3nsor-playbook/). In short:

- **Environment:** open the repo in VS Code and run **Dev Containers: Reopen in Container** ([`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json) pins Node 22.21.0 and installs ESLint, Prettier, and Claude Code). Without a container, use Node from [`.nvmrc`](.nvmrc) and run `npm ci && npm --prefix proxy ci`.
- **Checks:** `npm run ci` runs ESLint, the Prettier check, all unit tests (`npm test`: extension rules plus 42 extension, 19 proxy, and 10 script tests), `npm audit` at the high level, and the Playwright browser tests (`npm run test:e2e`: 6 Try it page tests and 3 extension popup tests; run `npx playwright install chromium` once). CI runs the `checks` and `e2e` jobs on every pull request and push to `main`; both are required to merge.
- **Monitoring:** [`.github/workflows/monitor.yml`](.github/workflows/monitor.yml) runs [`scripts/monitor.mjs`](scripts/monitor.mjs) every 15 minutes against the live site and proxy. A failure fails the run (GitHub emails the owner) and opens an `outage` issue; the next passing run closes it. Run it by hand with `npm run monitor`, or from the Actions tab with **simulate_failure** to test alerting.
- **What is live:** `https://michael-peterson.com/IS-581/version.json` names the deployed commit and extension version; the proxy's `/health` names its commit and environment.
- **Workflow:** GitHub Flow with squash merges into a protected `main`; work is tracked on the [Trello board](https://trello.com/b/SpwkYnNw/c3nsor). Claude Code guidance and permissions live in [`CLAUDE.md`](CLAUDE.md) and [`.claude/settings.json`](.claude/settings.json).

## Sharing with testers

- **Try it (no install):** `https://michael-peterson.com/IS-581/try.html` has sample sites, live analysis of any site URL, and paste-your-policy, using the same analyzer as the extension.
- **Download:** the Extension page links `downloads/c3nsor-extension.zip` plus 2-minute install steps.
- **Chrome Web Store (unlisted):** checklist and paste-ready listing in [`extension/STORE.md`](extension/STORE.md).

## User testing

[`testing/`](testing/README.md) has the moderated user-testing kit for the MVP: readiness checklist, key metrics, recruiting, session script, survey, results log, and the learnings-and-tweaks report template. Testers use the Try it page by default; the extension is an optional track. Metrics come from sessions and a survey only; c3nsor has no telemetry.

## GitHub Pages

The site deploys with GitHub Actions ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)) on every push to `main`. In repo **Settings → Pages**, Source must be **GitHub Actions**.

The `checks` job (lint, format check, tests, audit) and the `e2e` job (Playwright) run first; on `main` only, the `deploy` job then runs `npm run build:web` in `extension/`, which:

- copies the browser-safe analyzer modules into `docs/try/engine/`
- builds `docs/downloads/c3nsor-extension.zip`

It also writes `docs/version.json`. All three outputs are gitignored. The `verify-deploy` job then waits until the live `version.json` reports the commit just deployed (up to 10 minutes while the CDN updates) and smoke-checks the home page and Try it page. To roll the site back, revert the pull request; the merge redeploys and `verify-deploy` confirms it.

To preview the site locally:

```bash
npm --prefix extension run build:web && npm run serve
# open http://localhost:8765/try.html
```

Refresh the demo’s sample results with `cd extension && npm run samples` (needs network), then commit `docs/try/samples.json`.

## Live URL analysis (proxy)

Browsers block a web page from downloading other sites’ pages, so the Try-it page uses a small proxy to analyze a pasted URL. Samples and pasted text work without it.

The proxy is deployed at `https://c3nsor-policy-proxy.petersonmichaelc.workers.dev` and set as `PROXY_URL` in [`docs/try/config.js`](docs/try/config.js). To redeploy after changing [`proxy/worker.js`](proxy/worker.js):

```bash
cd proxy
npm ci                   # installs the pinned Wrangler version
npm test                 # unit tests, no network
npx wrangler login       # once per machine
npm run deploy:staging   # any clean branch → c3nsor-policy-proxy-staging
npm run deploy           # clean, up-to-date main only → production
```

Both deploy commands refuse uncommitted changes, stamp the commit into the Worker's `VERSION`, and finish with a smoke check: `/health` must report that commit, and a live policy fetch must succeed. Staging is at `https://c3nsor-policy-proxy-staging.petersonmichaelc.workers.dev` and also accepts `http://localhost:8765`. To roll back, run `npx wrangler rollback` (add `--env staging` for staging), then `npm run health` to confirm which commit is running, and revert the pull request so `main` matches production.

Every proxy response carries `X-Request-Id` and `X-C3nsor-Version`, and every request writes one JSON log line (host names, status, size, and timing; never full URLs, query strings, or visitor IPs) to Workers Logs. The Try it page shows the request ID as "Reference: …" under errors, so a visitor's report can be matched to the log line in the Cloudflare dashboard (**Workers & Pages → c3nsor-policy-proxy → Logs**). Request counts, error rates, and response times are under **Metrics**.

To use your own Cloudflare account instead, deploy the same way (the account needs a workers.dev subdomain), update the URLs in [`proxy/scripts/deploy.mjs`](proxy/scripts/deploy.mjs), and put the production URL in `config.js`. Set `PROXY_URL` to `""` to switch live URL analysis off.

`ALLOWED_ORIGINS` in [`proxy/wrangler.toml`](proxy/wrangler.toml) limits which sites can call the proxy (the staging Worker also allows `http://localhost:8765` for local previews). The Worker only fetches public http(s) hostnames on default ports, re-checks every redirect, caps pages at 1.5 MB / 12 s, accepts HTML only, and returns it as plain text. For extra protection against abuse, add a Cloudflare rate-limiting rule for the Worker route.

## Security

See [`SECURITY.md`](SECURITY.md) for the threat model, protections, and how to report a vulnerability. In short: third-party policy text is only ever rendered as text (never HTML), the extension and every site page ship a strict Content Security Policy, and there is no database or SQL anywhere.

Each page in `docs/` declares its CSP in a `<meta http-equiv="Content-Security-Policy">` tag (GitHub Pages can’t send headers). If you add a script, stylesheet, font, form target, or fetch to another origin, add it to that page’s CSP; keep scripts and styles in files (no inline `<script>`, `<style>`, `style=""`, or `onclick=""`). `cd extension && npm run verify` fails if a page or the extension loses its CSP or reintroduces `innerHTML`-style rendering.
