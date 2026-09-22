# Demo checklist (class / workshop)

Use this before presenting the MVP. Goal: show **find policy → five findings with citations → guidance + links**, without chasing flaky sites live.

## Known-good sites (try in this order)

Open the homepage (or a normal product page), click the c3nsor icon, wait for analysis.

| Site | Why | Paste-URL backup if discovery fails |
| --- | --- | --- |
| [duckduckgo.com](https://duckduckgo.com/) | Clear English policy, stable | https://duckduckgo.com/privacy |
| [mozilla.org](https://www.mozilla.org/) | Strong “Privacy Policy” link | https://www.mozilla.org/privacy/ |
| [wikipedia.org](https://www.wikipedia.org/) / Wikimedia | Straightforward policy language | https://foundation.wikimedia.org/wiki/Policy:Privacy_policy |
| [nytimes.com](https://www.nytimes.com/) (optional) | Rich findings / ads language | https://www.nytimes.com/privacy/privacy-policy |

**Avoid as first click:** SPA-heavy privacy hubs (Meta/Instagram privacy center often returns an empty JS shell), login walls, and pages that only show a cookie banner with no real policy link. Marketing sites without a policy should fail discovery (paste a policy URL if you have one).

## Rehearsal script (~2 minutes)

1. **Load** the unpacked `extension/` folder; pin the icon.
2. Open **DuckDuckGo** → Analyze → point at **Alerts** count, one **Found** row with excerpt, and **What you should do**.
3. Click **Open privacy policy** (or opt-out if present).
4. If discovery fails anywhere: paste the backup URL → **Analyze**.
5. Say out loud: *rules, not AI · not legal advice · landing page is the product vision; this extension is the Understand checkpoint.*
6. Optional: **Clear cache** then **Refresh** to show a fresh run.

## Permissions one-liners (if asked)

- **activeTab** — only when you open the popup on the current tab  
- **scripting** — find privacy-policy links on that page  
- **storage** — short session cache of findings (not a visit history product)  
- **Host access** — fetch the policy URL so analysis can run locally  

Kill switch: disable the extension in `chrome://extensions`. There is no always-on network filter in this MVP.
