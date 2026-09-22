# c3nsor Chrome extension (MVP)

Rules-based privacy checkpoint: find the current site’s privacy policy, show five key data practices in clear English with citations, and offer short guidance plus action links. **No AI. No trackers blocked. No browsing history sent to a server.**

## What it does

1. Detects the active tab’s domain.
2. Scans the page for privacy-policy links (and common paths like `/privacy`).
3. Downloads and cleans the policy text locally.
4. Matches five categories with keyword/rules templates:
   - What data is collected
   - How the data is used
   - Who the data is shared with
   - Targeted advertising / sale or sharing
   - Access, opt-out, or deletion choices
5. Shows a plain-English explanation and a **verbatim excerpt** for each hit (or “Not clearly specified”).
6. Suggests what you should do and links to the policy / opt-out page when found; can copy a privacy contact email.

## Load unpacked (Chrome)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `extension/` (the folder that contains `manifest.json`).
5. Open any `https://` site, click the c3nsor icon.

If automatic discovery fails, paste a policy URL in the popup and click **Analyze**.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Read the current tab when you open the popup. |
| `scripting` | Run a short discover script on the page to find policy links. |
| `storage` | Session cache of analysis results (domain + structured findings only, ~30 minutes). |
| Host access (`http(s)://*/*`) | Fetch the privacy policy document you (or the page) already pointed to. |

c3nsor does **not** log a history of sites you visit to any server. Session cache stays in the browser and can be cleared from the popup.

## How analysis works

Explanations come from **predefined templates** plus regex/keyword matches over policy sentences. This is intentionally limited and can miss nuanced language. It is **not** legal advice and **not** an AI summary.

## Project layout

```
extension/
  manifest.json
  background/service-worker.js
  content/discover.js
  lib/          # clean, fetch, rules, templates, cache
  popup/
  icons/
  README.md
```

## Development notes

- Manifest V3, ES modules in the service worker.
- Policy download is capped (~1.5 MB) and timed out (~12s).
- Refresh forces a new analysis; otherwise the session cache is reused per domain.

## Verify locally (optional)

```bash
cd extension
node scripts/verify-rules.mjs    # offline sample policy
node scripts/verify-live.mjs     # fetch a few public policies (needs network)
```
