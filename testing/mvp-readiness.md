# MVP readiness checklist

Rubric item 1: the prototype's quality should not distract from getting feedback. Run this checklist before the first session, and repeat the "verify manually" part after any code change or deploy.

**Scope tested:** the Try it page (primary track, live URL analysis) and, for the optional extension track, the c3nsor Chrome extension 0.1.1. This is the MVP "Understand + light Act" checkpoint: find the policy, show five checkpoints with citations, and offer Open policy, Opt out, and Copy email. The home page's vision features are not part of the test.

## Already satisfied in the code

These were checked by reading the repo on Oct 1, 2026 (through commit 426be41). Re-check if the code changes.

**Try it page (primary)**

- [x] Live URL analysis is switched on: `docs/try/config.js` points at the deployed Cloudflare proxy, so visitors can type any website into **Paste a site or policy URL**.
- [x] The proxy only fetches public http(s) pages, re-checks redirects, caps pages at 1.5 MB and 12 seconds, accepts HTML only, and only answers requests from the live site (michael-peterson.com). The Worker code doesn't log the sites people type.
- [x] Pages are parsed without running their scripts, and analysis runs in the visitor's browser with the same rules engine as the extension.
- [x] When no policy text can be read, the page says "Couldn't find readable policy text on that site. Open the policy to read it, or paste its text below." and offers a link instead of failing silently.
- [x] Fallbacks exist on the page itself: four saved samples (DuckDuckGo, Mozilla, Wikimedia, Discover) and **Paste policy text**.
- [x] The Try it page shows the same five checkpoint labels and Open policy / Opt out / Copy email actions as the extension, and states "Rules-based matching with citations. Not AI, not legal advice."

**Both tracks**

- [x] Local `main` matches `origin/main`, so the GitHub Pages deploy should serve the same code.
- [x] There is no analytics or telemetry code in the extension or the Try it page. Metrics come only from sessions and the survey.
- [x] The Extension page separates the MVP from the vision ("Landing is the vision. This page is the MVP.") and says the Chrome Web Store listing is coming soon.
- [x] The extension, Extension page, and Try it page use the same c3nsor name, "c3" mark, and five checkpoint labels.
- [x] Known limits (rules not AI, not legal advice, script-heavy privacy hubs) are stated on the Extension page, the Try it page, and in the session script intro.

**Extension (optional track)**

- [x] The manifest is version 0.1.1 and asks only for `activeTab`, `scripting`, and `storage` at install. Other hosts are optional, so testers don't see a "read all sites" warning.
- [x] The locally built zip contains version 0.1.1, including `lib/policy-access.js` and the new icons.
- [x] Fallbacks exist when discovery fails: the **Policy URL (if not found)** box, **Try another policy URL** suggestions, an **Open privacy policy** link, and the **Allow c3nsor to read <host>** button for cross-site policies.

## Verify manually before the first session

**Try it page (required)**

- [ ] The GitHub Actions Pages run for the latest commit passed (repo **Actions** tab).
- [ ] Open https://michael-peterson.com/IS-581/try.html on a laptop and on a phone. Use the live URL, not a local preview; the proxy rejects other origins.
- [ ] Type each of these into **Paste a site or policy URL** and confirm findings appear: duckduckgo.com, wikipedia.org, mozilla.org, discover.com. Time analyze-to-result for each so you know what's normal before testers arrive (M2).
- [ ] Compare those live results against the answer key in [`session-script.md`](session-script.md#answer-key-for-the-core-question-set), and update the key if they differ. If discover.com fails live, plan to use the Discover sample for Task 3.
- [ ] Confirm each DuckDuckGo and Wikimedia answer in the answer key is true in the live policy text, since the time-saved comparison scores both conditions against it. Also confirm both home pages (duckduckgo.com and www.wikipedia.org) link to their privacy policy, so the manual-reading task is fair.
- [ ] Type one or two tester-style sites (a shopping site, an AI tool, or a school or work app you've signed up for) and note whether each is found, open-only, or fails. This previews what testers will see in Task 4.
- [ ] Type instagram.com and confirm you get either findings or an Open policy link, not a hang.
- [ ] Type example.com and confirm the "Couldn't find readable policy text on that site" message and link.
- [ ] Type a domain that doesn't exist (for example c3nsor-no-such-site-test.com) and confirm the error is in plain language. The wording is being rewritten now; until that change ships, note what the error currently says so you can reassure testers if they hit it.
- [ ] Action buttons: **Opt out** on discover.com opens the opt-out form, **Copy email** on wikipedia.org copies privacy@wikimedia.org, and greyed-out buttons are clearly disabled (check on a phone, where hover tooltips don't show).
- [ ] The four samples load, and **Paste policy text** analyzes a pasted policy.
- [ ] You have the tester-facing limits line ready (session script intro), and you will not send testers to the home page.

**Extension (only if you'll offer the optional track)**

- [ ] On a clean Chrome profile, download the zip from https://michael-peterson.com/IS-581/extension.html#install, unzip, Load unpacked, and pin the icon. Time yourself; it should take under 3 minutes. Confirm `chrome://extensions` shows version 0.1.1 and the new icon. If the Chrome Web Store listing is approved by then, test that link instead.
- [ ] mozilla.org shows findings from the toolbar icon, and the badge shows the alert count.
- [ ] Allow prompt: on www.wikipedia.org, click **Allow c3nsor to read foundation.wikimedia.org**, approve in Chrome, and confirm results appear (reopen the popup if it closed). Then remove the permission in `chrome://extensions` so the next test starts fresh.
- [ ] No-policy fallback: on example.com, the popup shows an error and the Policy URL box instead of empty results.
- [ ] **Refresh** re-runs analysis, and **Clear cache** followed by **Refresh** works.

## Recommended fixes (before or after testing)

These are real issues found while reviewing the product. They aren't fixed here; decide whether to fix them before testing (if they would distract testers) or to watch for them during sessions and use the evidence in [`learnings-and-tweaks.md`](learnings-and-tweaks.md). Issues 1 to 4 affect the Try it page, so every tester can run into them.

1. **"Alerts" counts reassuring findings.** The alert count is the number of checkpoints found, including "Says they do not sell personal information." DuckDuckGo, a privacy-focused site, shows the maximum "5 alerts" (and a 5 on the extension badge). Testers may read this as "risky site," which hurts comprehension (M4) and trust (M5). The Try it page is also inconsistent: sample buttons say "5/5 found" while the result card says "5 alerts". Possible fix: use "5 of 5 topics found" everywhere, or leave "does not sell" out of the alert count. At minimum, ask testers what "5 alerts" means (the session script does).
2. **Some citations don't support their summary.** Examples from the Try it snapshots: DuckDuckGo's "What data is collected" citation is about disclosure ("we will only disclose the very limited personal information..."); Mozilla's "Who the data is shared with" citation is about legal defenses; Discover uses the same generic "Privacy Center" sentence for two checkpoints. Testers who check citations will notice, which hurts trust (M5). Possible fix: choose the excerpt from the sentence that matched the summary terms.
3. **Collected and used summaries ignore negation.** Negation is only handled for selling. A sentence like "we don't store your IP address" can still add "IP address" to "May collect." DuckDuckGo's summary lists "IP address" and "location"; check this against the live DuckDuckGo policy. Possible fix: reuse the existing negation check for collected and used terms.
4. **Choices summary and Opt out button disagree on DuckDuckGo.** The summary says "You can: opt out; request deletion; access your data," but the Opt out button is greyed out because no opt-out link was found. The reason only appears as a hover tooltip, which phone testers can't see. Possible fix: show a short line such as "No opt-out link found. See the policy."
5. **The Try it page's privacy line is now out of date.** The page intro says "Nothing you paste leaves your browser," but websites typed into the URL box are now downloaded through the c3nsor proxy, so the site address does leave the browser (pasted policy text still doesn't). The note under the URL box already says pages are downloaded through the proxy, so the two lines contradict each other. For a privacy product, this could cost trust (M5) if a tester notices. Possible fix: "Pasted text never leaves your browser. Websites you type are downloaded through our proxy and analyzed in your browser."
6. **Allow prompt can close the popup (extension track).** After approving in Chrome, the popup may close, and the results only appear when the tester clicks the icon again. The hint under the Allow button doesn't say this. Possible fix: add "If this window closes, click the c3nsor icon again."
7. **Extension page mockup doesn't match the real result.** The popup preview on the Extension page shows duckduckgo.com with "4 alerts" and "Unclear" for sale/sharing; the real result is 5 alerts with all five Found. Possible fix: update the mockup text.
8. **Clear cache leaves old results on screen (extension track).** After **Clear cache**, the previous findings stay visible under "Cache cleared. Refresh to re-analyze." Minor; possible fix: hide findings when the cache is cleared.
9. **"GET ACCESS" in the header links to the vision waitlist.** On the Extension and Try it pages, this button goes to the home page waitlist, which describes features the MVP doesn't have. Minor for moderated sessions; tell testers it's for the future product if they ask.
