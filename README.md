# c3nsor

Website and Chrome extension for **c3nsor**, which shows people what a site’s privacy policy says about their data before they sign up.

| Folder | What it is |
| --- | --- |
| [`docs/`](docs/) | GitHub Pages site: home, Extension page, **Try it** web demo, privacy policy |
| [`extension/`](extension/) | Chrome MV3 extension (rules-based, local analysis). See its [README](extension/README.md) |
| [`proxy/`](proxy/) | Cloudflare Worker that lets the web demo download policy pages for live URL analysis |

## Sharing with testers

- **Try it (no install):** `https://michael-peterson.com/IS-581/try.html` has sample sites, live analysis of any site URL, and paste-your-policy, using the same analyzer as the extension.
- **Download:** the Extension page links `downloads/c3nsor-extension.zip` plus 2-minute install steps.
- **Chrome Web Store (unlisted):** checklist and paste-ready listing in [`extension/STORE.md`](extension/STORE.md).

## GitHub Pages

The site deploys with GitHub Actions ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)) on every push to `main`. In repo **Settings → Pages**, Source must be **GitHub Actions**.

The workflow runs the analyzer checks, then `npm run build:web` in `extension/`, which:
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
npm test              # unit tests, no network
npx wrangler login    # once per machine
npx wrangler deploy
```

To use your own Cloudflare account instead, deploy the same way (the account needs a workers.dev subdomain) and put the printed `https://c3nsor-policy-proxy.<you>.workers.dev` URL in `config.js`. Set `PROXY_URL` to `""` to switch live URL analysis off.

`ALLOWED_ORIGINS` in [`proxy/wrangler.toml`](proxy/wrangler.toml) limits which sites can call the proxy (add `http://localhost:8000` while previewing locally). The Worker only fetches public http(s) hostnames on default ports, re-checks every redirect, caps pages at 1.5 MB / 12 s, accepts HTML only, and returns it as plain text. For extra protection against abuse, add a Cloudflare rate-limiting rule for the Worker route.
