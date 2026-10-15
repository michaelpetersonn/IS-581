# c3nsor

Website and Chrome extension for **c3nsor**, which shows people what a site’s privacy policy says about their data before they sign up.

| Folder                                     | What it is                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| [`docs/`](docs/)                           | GitHub Pages site: home, Extension page, **Try it** web demo, privacy policy              |
| [`extension/`](extension/)                 | Chrome MV3 extension (rules-based, local analysis). See its [README](extension/README.md) |
| [`instagram-blocker/`](instagram-blocker/) | Optional Chrome MV3 extension that blocks Instagram for 30 days (password early unlock)   |
| [`proxy/`](proxy/)                         | Cloudflare Worker that lets the web demo download policy pages for live URL analysis      |
| [`testing/`](testing/)                     | User-testing kit for the MVP (metrics, session script, survey, report template)           |

## Development

New developers start with the [Tech Employee Playbook](https://michael-peterson.com/c3nsor-playbook/). In short:

- **Environment:** open the repo in VS Code and run **Dev Containers: Reopen in Container** ([`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json) pins Node 22.21.0 and installs ESLint, Prettier, and Claude Code). Without a container, use Node from [`.nvmrc`](.nvmrc) and run `npm ci && npm --prefix proxy ci`.
- **Checks:** `npm run ci` runs ESLint, the Prettier check, all tests (`npm test`: extension rules plus extension tests, proxy tests, and Instagram blocker tests), and `npm audit` at the high level. CI runs the same job, named `checks`, on every pull request and push to `main`.
- **Workflow:** GitHub Flow with squash merges into a protected `main`; work is tracked on the [Trello board](https://trello.com/b/SpwkYnNw/c3nsor). Claude Code guidance and permissions live in [`CLAUDE.md`](CLAUDE.md) and [`.claude/settings.json`](.claude/settings.json).

## Sharing with testers

- **Try it (no install):** `https://michael-peterson.com/IS-581/try.html` has sample sites, live analysis of any site URL, and paste-your-policy, using the same analyzer as the extension.
- **Download:** the Extension page links `downloads/c3nsor-extension.zip` plus 2-minute install steps.
- **Chrome Web Store (unlisted):** checklist and paste-ready listing in [`extension/STORE.md`](extension/STORE.md).

## User testing

[`testing/`](testing/README.md) has the moderated user-testing kit for the MVP: readiness checklist, key metrics, recruiting, session script, survey, results log, and the learnings-and-tweaks report template. Testers use the Try it page by default; the extension is an optional track. Metrics come from sessions and a survey only; c3nsor has no telemetry.

## GitHub Pages

The site deploys with GitHub Actions ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)) on every push to `main`. In repo **Settings → Pages**, Source must be **GitHub Actions**.

The `checks` job (lint, format check, tests, audit) runs first; on `main` only, the `deploy` job then runs `npm run build:web` in `extension/`, which:

- copies the browser-safe analyzer modules into `docs/try/engine/`
- builds `docs/downloads/c3nsor-extension.zip`

Both outputs are gitignored. To preview the site locally:

```bash
cd extension && npm run build:web && cd ../docs && python3 -m http.server 8000
# open http://localhost:8000/try.html
```

Refresh the demo’s sample results with `cd extension && npm run samples` (needs network), then commit `docs/try/samples.json`.

## Live URL analysis (proxy)

Browsers block a web page from downloading other sites’ pages, so the Try-it page uses a small proxy to analyze a pasted URL. Samples and pasted text work without it.

The proxy is deployed at `https://c3nsor-policy-proxy.petersonmichaelc.workers.dev` and set as `PROXY_URL` in [`docs/try/config.js`](docs/try/config.js). To redeploy after changing [`proxy/worker.js`](proxy/worker.js):

```bash
cd proxy
npm ci               # installs the pinned Wrangler version
npm test             # unit tests, no network
npx wrangler login   # once per machine
npm run deploy
```

To use your own Cloudflare account instead, deploy the same way (the account needs a workers.dev subdomain) and put the printed `https://c3nsor-policy-proxy.<you>.workers.dev` URL in `config.js`. Set `PROXY_URL` to `""` to switch live URL analysis off.

`ALLOWED_ORIGINS` in [`proxy/wrangler.toml`](proxy/wrangler.toml) limits which sites can call the proxy (add `http://localhost:8000` while previewing locally). The Worker only fetches public http(s) hostnames on default ports, re-checks every redirect, caps pages at 1.5 MB / 12 s, accepts HTML only, and returns it as plain text. For extra protection against abuse, add a Cloudflare rate-limiting rule for the Worker route.

## Security

See [`SECURITY.md`](SECURITY.md) for the threat model, protections, and how to report a vulnerability. In short: third-party policy text is only ever rendered as text (never HTML), the extension and every site page ship a strict Content Security Policy, and there is no database or SQL anywhere.

Each page in `docs/` declares its CSP in a `<meta http-equiv="Content-Security-Policy">` tag (GitHub Pages can’t send headers). If you add a script, stylesheet, font, form target, or fetch to another origin, add it to that page’s CSP; keep scripts and styles in files (no inline `<script>`, `<style>`, `style=""`, or `onclick=""`). `cd extension && npm run verify` fails if a page or the extension loses its CSP or reintroduces `innerHTML`-style rendering.
