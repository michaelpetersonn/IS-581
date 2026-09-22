# Publish c3nsor to the Chrome Web Store

You can publish when the package is ready. **Only you** can submit (needs your Google account and a one-time developer fee). This guide is the checklist.

## Before you submit

1. **Google Chrome Web Store developer account**  
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) — one-time registration fee (currently $5 USD).

2. **Zip the extension** (from the repo root):

```bash
cd extension
npm run pack
# → creates c3nsor-extension.zip (no scripts/, no node_modules)
```

Or manually zip the contents of `extension/` **excluding** `scripts/`, `node_modules/`, `DEMO.md`, `STORE.md`, `package.json`, and `*.mjs`.

3. **Assets Google will ask for**
   - **Icon** 128×128 (you already have `icons/icon128.png` — consider a sharper branded mark before review).
   - **Screenshots** at least one (1280×800 or 640×400): popup on DuckDuckGo / Mozilla with Found rows visible.
   - **Small promo tile** 440×280 (optional but nice).
   - **Store description** — short + detailed; say **rules-based, local, not AI, not legal advice**.
   - **Privacy practices form** — host permissions are broad (`http(s)://*/*`) so explain clearly: *only to fetch the privacy-policy URL the user (or page) pointed to; processed locally; no server logging of browsing history.*
   - **Privacy policy URL** — required for many permission types. Use your hosted page, e.g. `https://YOUR-SITE/privacy-policy.html`, stating: no account, no remote analysis, session cache only.

4. **Permission justification (paste-ready)**

| Permission | Single sentence for the form |
| --- | --- |
| `activeTab` | Read the current tab when the user opens the popup. |
| `scripting` | Find privacy-policy links on that page. |
| `storage` | Cache analysis for the current session (~30 min), clearable by the user. |
| Host access | Download the privacy policy document so analysis can run on-device. |

## Submit flow

1. Dashboard → **New item** → upload `c3nsor-extension.zip`.
2. Fill listing, screenshots, category (e.g. Productivity / Privacy).
3. Complete privacy questionnaire honestly.
4. Submit for review (often a few days; broad host access can extend review).

## After approval

- Put the public Chrome Web Store URL on [`Landing Page/extension.html`](../Landing%20Page/extension.html) (replace the “coming soon” note).
- Bump `manifest.json` `version` for every new upload.

## Honest scope for the listing

Describe **only the MVP**: find policy → five findings + citations → guidance + action links.  
Do **not** claim tracker blocking, cookie locking, or interrupt warnings until those ship.
