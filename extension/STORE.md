# Publish c3nsor to the Chrome Web Store

Only you can submit (it needs your Google account and a one-time developer fee). This is the checklist plus paste-ready listing text.

**Recommended for testing:** publish as **Unlisted**. Testers get a normal “Add to Chrome” link, but the extension doesn’t show up in store search.

## Before you submit

1. **Developer account**: [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole), one-time $5 USD registration.

2. **Zip the extension** (from the repo root):

```bash
cd extension
npm run pack
# → creates c3nsor-extension.zip (no scripts/, no node_modules)
```

The same zip is published on the site at `downloads/c3nsor-extension.zip` on every Pages deploy.

3. **Assets Google asks for**
   - **Icon** 128×128: `icons/icon128.png`.
   - **Screenshots**: at least one, **1280×800** or **640×400**. Load the extension, open DuckDuckGo or Wikipedia, open the popup, and capture the browser window with the popup visible. Two or three shots is ideal (a 5-alert result, a result with an Opt out link, and the “Try another policy URL” fallback).
   - **Small promo tile** 440×280 (optional).
   - **Privacy policy URL**: `https://michael-peterson.com/IS-581/privacy-policy.html`

## Paste-ready listing

**Name:** c3nsor

**Summary (≤132 characters, matches `manifest.json`):**
Find a site’s privacy policy and see what it says about your data in plain English, with citations. Local rules, not AI.

**Category:** Productivity (or Privacy & Security if offered)

**Description:**

> Before you sign up or accept cookies, see what a site’s privacy policy actually says about your data.
>
> Click c3nsor on any website and it finds the privacy policy, reads it on your device, and answers five questions in one look:
> • What data is collected
> • How the data is used
> • Who it’s shared with
> • Whether it mentions selling or sharing your data (including “we do not sell”)
> • What choices you have to access, opt out, or delete
>
> Every finding shows a short quote from the policy so you can check it yourself. When the policy includes them, c3nsor gives you one-click links to the policy and the opt-out page, and copies the privacy contact email.
>
> Private by design: analysis runs locally with rules, not AI. No account, no tracking, and no list of the sites you visit is sent anywhere. Results are cached for about 30 minutes in this browser session, and you can clear them anytime.
>
> c3nsor is not legal advice. Some script-heavy privacy centers can’t be read automatically; in that case c3nsor links you straight to the policy.

**Single purpose (form field):**
Show the user what the current website’s privacy policy says about their data, with citations and links to act on it.

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| `activeTab` | Read the current tab’s URL when the user opens the popup. |
| `scripting` | Find privacy-policy links on the current page when the user opens the popup. |
| `storage` | Cache the analysis for the current session (~30 min), clearable by the user. |
| Host access (`http(s)://*/*`) | Download the privacy policy for whatever site the user is on so analysis can run on-device. Any site can host a policy, so access can’t be limited to a fixed list. |

**Data usage (privacy practices tab):**
- Collected user data: **none**. Policy pages are downloaded and analyzed on the device; nothing is sent to the developer.
- Certify: not sold to third parties; not used for purposes unrelated to the single purpose; not used for creditworthiness or lending.
- Remote code: **No**. All code ships in the package.

## Submit flow

1. Dashboard → **New item** → upload `c3nsor-extension.zip`.
2. **Store listing** tab: paste the text above, add screenshots and the icon.
3. **Privacy practices** tab: single purpose, permission justifications, data usage, privacy policy URL.
4. **Distribution** tab → Visibility: **Unlisted**.
5. Submit for review. It often takes a few days, and broad host access can make it longer.

## After approval

- Put the store link on [`docs/extension.html`](../docs/extension.html) and [`docs/try.html`](../docs/try.html) (replace the “coming soon” / zip note).
- Bump `manifest.json` `version` before every new upload.

## Honest scope for the listing

Describe **only the MVP**: find policy → five findings with citations → guidance and action links.
Do **not** claim tracker blocking, cookie locking, or interrupt warnings until those ship.
