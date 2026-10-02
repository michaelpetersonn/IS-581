# c3nsor Chrome extension (MVP)

Rules-based privacy checkpoint: find the current site’s privacy policy, show five key data practices in clear English with citations, and offer short guidance plus action links. **No AI. No trackers blocked. No browsing history sent to a server.**

## What it does

1. Detects the active tab’s domain.
2. Scans the page for privacy-policy links (and common paths like `/privacy`).
3. Downloads and cleans the policy text locally (size/time limited).
4. Rejects pages that do **not** look like a privacy policy (e.g. marketing pages or cookie-banner demos).
5. Matches five categories with keyword/rules templates and builds a **one-look summary** (e.g. “Uses your data for: analytics; marketing”) plus a short cleaned citation:
   - What data is collected
   - How the data is used
   - Who the data is shared with
   - Mentions sale/sharing (including “we do not sell”)
   - Access, opt-out, or deletion choices
6. Shows a plain-English summary and a **verbatim excerpt** for each hit (or “Not clearly specified”).
7. Shows an **Alerts** count (how many categories matched) in the popup and on the toolbar badge.
8. Suggests what you should do and links to the policy / opt-out page when found; can copy a real privacy contact email (placeholder addresses like `you@domain.com` are ignored).

## Sharing with testers

- **No install:** send people to the site’s **Try it** page (`docs/try.html`). It runs the same analyzer in the browser with sample sites, pasted policy text, and live URLs (via the Cloudflare proxy in `proxy/`).
- **Real extension:** the site serves `downloads/c3nsor-extension.zip`, built on every Pages deploy. Testers unzip it and follow the steps below. Once the unlisted Chrome Web Store listing is approved, share that link instead (see [`STORE.md`](STORE.md)).

## Load unpacked (Chrome)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `extension/` (the folder that contains `manifest.json`), or the unzipped `c3nsor-extension` folder.
5. Open any `https://` site, click the c3nsor icon.

If automatic discovery fails, paste a policy URL in the popup and click **Analyze**. Suggested policy links also include **Open** so you can read the live page when a site is too script-heavy to extract excerpts.

## Class demo

See [`DEMO.md`](DEMO.md) for known-good sites, paste-URL backups, and a short rehearsal script.

## Chrome Web Store

See [`STORE.md`](STORE.md) for the publish checklist, permission justifications, and packing steps (`npm run pack`).

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Access the current tab only when you open the popup. Same-site policy pages are downloaded from inside that tab. |
| `scripting` | Run the bundled discover script (and the policy download) in that tab. |
| `storage` | Session cache of analysis results (domain + structured findings only, ~30 minutes). |
| Optional host access (`http(s)://*/*`) | Not granted at install. When a policy lives on another host (e.g. `policies.google.com`), the popup shows **Allow c3nsor to read …** and Chrome asks for that one host. |

Policy download logic lives in [`lib/policy-access.js`](lib/policy-access.js) and is covered by `scripts/verify-access.mjs` (including a check that the manifest never requests every site at install).

c3nsor does **not** log a history of sites you visit to any server. Session cache stays in the browser (`chrome.storage.session`) and can be cleared from the popup. Fetches use `credentials: "omit"` (no cookies sent).

## Security

Policy pages are untrusted, so the popup renders everything with `textContent` through [`popup/render.js`](popup/render.js) (no `innerHTML`), and `manifest.json` sets a strict `content_security_policy.extension_pages` (`script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`). The service worker only answers this extension's own pages and validates every message in [`lib/messages.js`](lib/messages.js). Threat model and reporting: [`SECURITY.md`](../SECURITY.md).

## How analysis works

Explanations come from **predefined templates** plus regex/keyword matches over policy sentences. This is intentionally limited and can miss nuanced language. It is **not** legal advice and **not** an AI summary.

**Known limits:** JS-heavy privacy hubs (e.g. Meta/Instagram privacy center) often ship an empty HTML shell — the extension cannot run their page JavaScript, so analysis may fail until a printable/static policy URL is pasted.

## Project layout

```
extension/
  manifest.json
  background/service-worker.js
  content/discover.js
  lib/          # clean, fetch, rules, summarize, templates, result, cache, messages
  popup/        # popup.html/js/css + render.js (safe DOM builders)
  icons/
  scripts/      # verify + build-web (site engine copy, zip) + build-samples
  README.md
```

`clean.js`, `rules.js`, `summarize.js`, `templates.js`, and `result.js` must stay browser-safe (no `chrome.*`): `npm run build:web` copies them into `docs/try/engine/` for the web demo.

## Development notes

- Manifest V3, ES modules in the service worker.
- Policy download is capped (~1.5 MB) and timed out (~12s).
- Refresh forces a new analysis; otherwise the session cache is reused per domain.
- Discover runs only when you open/analyze via the popup (not on every navigation).

## Verify locally (optional)

```bash
cd extension
npm run verify                   # offline rule checks, web demo helpers, access, XSS/CSP/message-validation tests
node scripts/verify-live.mjs     # fetch a few public policies (needs network)
npm run build:web                # copy engine to docs/try/engine/ + zip to docs/downloads/
npm run samples                  # refresh docs/try/samples.json (needs network)
```
