# Moderated session script

**Length:** about 22 minutes on the Try it track, or about 28 minutes with the optional extension track, plus a 3-minute survey.

One moderator runs the session and takes notes. A second teammate can take notes if available. Read the lines in quotes; everything else is moderator guidance. Metric IDs (M1 to M9) refer to [`metrics.md`](metrics.md).

## Tracks

- **Try it track (default, every tester):** the tester uses the Try it page at https://michael-peterson.com/IS-581/try.html. No install, and it works on a phone or a laptop. They type any website into **Paste a site or policy URL** and get the same rules engine, five checkpoints, and Open policy / Opt out / Copy email actions as the extension.
- **Extension track (optional add-on):** for testers on Chrome on a laptop or desktop who are willing to install. It covers what only the extension shows: the toolbar badge, finding the policy for the page you're already on, the **Allow c3nsor to read <host>** prompt, and the unprompted sign-up observation for the automatic-alert hypothesis (H1). Install from the zip at https://michael-peterson.com/IS-581/extension.html#install, or use the Chrome Web Store link once the unlisted listing is approved.

Decide before the session whether to offer the extension track. Run it only if there's time and the tester agrees; never let it cut into the Try it tasks.

## Before the session

- Run the [`mvp-readiness.md`](mvp-readiness.md) checklist at least once this week.
- Have ready: a stopwatch with a lap button (a phone works), the note-taking grid (bottom of this page), the survey link, the answer key below, and a question card with the core question set:
  1. "Does this site sell your data?"
  2. "Can you opt out or delete your data? How?"
  3. "Who does this site share your data with? Name one."
- Assign the tester's rotation for the time-saved comparison (see below).
- Do not send testers to the home page. It shows the future vision (tracker blocking, cookie locking, "High risk" ratings, Delete/Leave), and this test covers only the MVP: the Understand checkpoint with light Act links.
- Remote sessions: see [`recruiting.md`](recruiting.md#running-remote-sessions). Paste links in the call chat rather than reading them aloud.

## Time-saved comparison

Each tester answers the core question set twice: once by reading a privacy policy themselves (Task 1), and once with the Try it page on a different site (Task 2). The two sites swap on alternate testers so neither policy's length favors one condition. Both conditions run on the same device.

| Rotation | Testers    | Task 1: read it yourself | Task 2: Try it page |
| -------- | ---------- | ------------------------ | ------------------- |
| A        | T1, T3, T5 | duckduckgo.com           | wikipedia.org       |
| B        | T2, T4     | wikipedia.org            | duckduckgo.com      |

Rules for both conditions:

- Show the question card first, then start the timer. Stop it when the tester gives the last answer.
- The manual condition is capped at 180 seconds. If the tester gives up or hits the cap, record 180 and mark it as a timeout.
- Don't confirm or correct answers until the session is over.
- Score both conditions against the answer key at the bottom of this page.

The manual task always comes first, before the tester has seen c3nsor, so its five-checkpoint layout can't teach them where to look in a policy. The Try it condition is the tester's first time using the page, so its time includes finding the input box and typing the site. That makes the comparison conservative. See [`metrics.md`](metrics.md#m8-time-saved) for the reasoning and calculation.

## 1. Intro (2 min)

> "Thanks for doing this. I'm testing c3nsor, an early tool that finds a website's privacy policy and shows what it says about your data. We're testing the product, not you, so if something is confusing, that's exactly what we need to hear. Please think out loud as you go: what you're looking at, what you expect, what surprises you. I won't help much during tasks because I want to see what happens on your own, but I'll step in if you get stuck."

Read the consent and recording lines from [`recruiting.md`](recruiting.md#consent-and-recording).

> "A few honest limits up front: c3nsor uses rules, not AI, so it can miss nuance. It isn't legal advice. Some sites with script-heavy privacy pages can't be read automatically, and then it gives you a link to the policy instead."

## 2. Background (2 min)

Ask and note short answers:

1. "When did you last create an account on a new site or app? Did you look at what it does with your data? Why or why not?"
2. "Has a site ever used your data in a way you didn't expect? What happened?"
3. "What sites or apps are you thinking of signing up for soon?" (Note these for Task 4.)

## 3. Try it tasks (15 min)

For each task, record Unaided / Assisted / Failed (M1), any timing, and notable quotes in the grid.

### Task 1. Read a policy yourself (baseline, up to 4 min)

Use the tester's Rotation A or B site. This task doesn't use c3nsor and doesn't count toward M1.

> "Before we look at c3nsor: imagine you're about to sign up for [site]. Here are three questions. Starting from the home page, find the site's privacy policy and answer them however you normally would. Take as long as you need, up to 3 minutes, and tell me if you'd give up."

- Show the question card, open the site's home page, and start the timer.
- Stop at the last answer, at a give-up, or at 180 seconds (M8).
- Note how they search: scrolling to the footer, using find-in-page, skimming headings.

### Task 2. Check a site on the Try it page (timed, 4 min)

Use the other Rotation site.

> "Now imagine you're about to sign up for [other site]. Here's a link to c3nsor. Use it to answer the same three questions about [other site]."

- Show the question card, share the Try it link, and start the timer when the tester opens it.
- Press lap when they click **Analyze** and again when the five checkpoints appear. Lap 2 is **link-to-result**; lap 2 minus lap 1 is **analyze-to-result** (M2).
- Stop the timer at the last answer (M8). These answers also count toward comprehension (M4).
- If they click a saved sample instead of typing the site, let them continue and note it; the answers still count.
- Note any action button they click on their own (M6). Then ask: "What, if anything, would you do now?" (M6, `said`)
- Ask: "What does '5 alerts' mean to you?" (Watch for people reading it as "risky site".)

### Task 3. Find an opt-out (2 min)

> "You've heard Discover shares customer data with partners and you want to stop that. Use c3nsor to find out how."

- Success (M1) = types discover.com, clicks **Opt out**, and lands on Discover's opt-out request form. If live analysis of discover.com fails during the readiness check, use the Discover sample instead.
- This task is prompted, so don't count it toward the action rate (M6).

### Task 4. Sites you actually use (5 min)

Extension-track testers skip this task and go to the optional extension track now; Task E3 covers the same ground in the extension.

> "Pick one or two sites or apps you've signed up for recently, or are about to. Check them with c3nsor."

- For each site, record the result for M3: `auto` (findings from the typed home page), `paste` (worked only after typing the policy URL or pasting its text), `open-only` (only the Open policy link worked), or `fail`.
- If they see "Couldn't find readable policy text on that site", let them try the Open policy link or paste the policy text before stepping in.
- Ask the core question set (M4) and "What, if anything, would you do now?" (M6)
- Write down the policy URL so you can check their answers against the citation after the session.

## 4. Optional extension track (11 min, replacing Task 4, so it adds about 6 min)

Only for testers on Chrome on a laptop or desktop who agree to install. Skip to the wrap-up otherwise.

### Task E1. Install and first result (up to 5 min)

> "c3nsor also comes as a Chrome extension. Here's the link. Please install it, then open mozilla.org and use it."

- Start the stopwatch when the install page (or the Chrome Web Store page) opens. Stop when the five checkpoints appear in the popup on mozilla.org. This is **install-to-result** (M2). Mozilla is used because the tester hasn't analyzed it yet.
- Press lap when they click the toolbar icon on mozilla.org. Lap to stop is **click-to-result** (M2).
- Watch for: unzipping, Developer mode, choosing the right folder in Load unpacked, pinning the icon.
- At 5 minutes, help them finish and mark Assisted.
- Ask: "What does the number on the c3nsor icon mean to you?" (badge)

### Task E2. Wikipedia and the Allow prompt (1 min)

> "Now open wikipedia.org and check it with the extension."

- On www.wikipedia.org the policy lives on foundation.wikimedia.org, so the popup shows **Allow c3nsor to read foundation.wikimedia.org** and Chrome asks for that one site.
- Watch for: whether they understand why it's asking, whether they approve, and what they do if the popup closes after approving (they need to click the c3nsor icon again).
- Success (M1) = findings shown without help. Don't ask the core questions; the tester has already seen this site in Task 1 or Task 2.

### Task E3. A sign-up you're actually considering (replaces Task 4, 5 min)

**Step 1, unprompted (automatic-alert hypothesis).** Don't mention c3nsor.

> "Pick a site or app you're thinking of signing up for, or one you signed up for recently. Go to its sign-up or create-account page and go through it the way you normally would. Stop before you enter any real personal details."

- Observe: does the tester click the c3nsor icon, or mention checking the policy, without being asked? Record Y or N in `signup_clicked_unprompted_Y_N`. Testers have been using c3nsor all session, so a Y overstates what they'd do on their own; an N is strong evidence.
- Then ask: "If I weren't sitting with you, would you have remembered to click c3nsor before finishing this sign-up? Why or why not?"

**Step 2, prompted.**

> "Now check this site with the extension."

- Record the M3 result: `auto`, `allow` (found after the Allow prompt), `paste` (worked only after pasting a policy URL into the popup), `open-only`, or `fail`.
- Ask the core question set (M4) and "What, if anything, would you do now?" (M6)
- If there's time, repeat Step 2 with a second site.

## 5. Wrap-up (3 min)

1. "What was the most useful part? The most confusing part?"
2. "Did anything make you trust the results more or less?" (M5)
3. "Would you use this before signing up for something? What would make you use it every time?" (M7)
4. Try it track only: "Next time you sign up for something, would you remember to check it with c3nsor first? How?" (H1)
5. "If you could change one thing, what would it be?"

Don't describe the automatic-alert options out loud; the survey presents them neutrally so the moderator's wording doesn't steer answers.

Then:

> "Last step: a 3-minute survey. Your tester ID is T__."

Survey link: `[PASTE GOOGLE FORM LINK HERE]` (built from [`survey.md`](survey.md)).

Within an hour, fill in one row of [`results-log.csv`](results-log.csv).

## Answer key for the core question set

Built from the Try it snapshots in `docs/try/samples.json`. Before the first session, run the same sites through the live Try it page and confirm each answer in the live policy text, because the time-saved comparison scores both conditions against this key. Update the key if the live results or policies differ.

| Site                      | Sells your data?                                              | Opt out or delete?                                                                                            | Shared with (any one)                                           |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| duckduckgo.com            | No. Result says "Says they do not sell personal information." | Policy mentions opt out, deletion, and access. No opt-out link found (Opt out and Copy email are greyed out). | service providers, vendors                                      |
| wikipedia.org (Wikimedia) | No. "Says they do not sell personal information."             | Access your data. Opt out link and Copy email (privacy@wikimedia.org) are available.                          | service providers, third parties, law enforcement or government |
| discover.com              | Unclear. The result doesn't say either way.                   | Yes. Opt out button opens the opt-out request form.                                                           | partners, vendors, or other third parties                       |
| mozilla.org (spare)       | Unclear.                                                      | Unclear in the summary; an Opt out link to cookie settings is available.                                      | affiliates, third parties, law enforcement or government        |

Scoring notes:

- In the manual condition, any answer the policy supports is correct, including recipients not listed above.
- "Unclear" is a correct c3nsor-condition answer when the result shows Unclear. If a tester says "it sells data" because they saw **Found** next to "Mentions sale / sharing", score it as a tester misread and note it; that's a design issue to fix.
- If the result itself looks wrong (for example, a citation that doesn't match its summary), score the tester's answer as correct for M4 and log a `c3nsor_errors` entry. For M8 accuracy, score against the policy.

## Note-taking grid

Copy this grid for each session.

Tester ID: ____ Persona: ____ Track: try_page / extension (Try it tasks plus the extension track) Rotation: A / B Date: ____ Device and browser: ____

**Time-saved comparison (M8)**

| Condition            | Site | Seconds | Timeout or gave up (Y/N) | Correct (of 3) |
| -------------------- | ---- | ------- | ------------------------ | -------------- |
| Manual (Task 1)      |      |         |                          |                |
| Try it page (Task 2) |      |         | n/a                      |                |

**Tasks**

| Task                           | Unaided / Assisted / Failed | Time (s)                              | Policy result (Task 4 or E3) | Core questions correct (of 3) | Action: clicked / said / none / unavailable | Observations and quotes          |
| ------------------------------ | --------------------------- | ------------------------------------- | ---------------------------- | ----------------------------- | ------------------------------------------- | -------------------------------- |
| 1. Read it yourself            | (baseline, not scored)      | see above                             |                              | see above                     |                                             |                                  |
| 2. Try it page                 |                             | link-to-result: / analyze-to-result:  |                              | see above                     |                                             |                                  |
| 3. Find opt-out                |                             |                                       |                              |                               | (not counted)                               |                                  |
| 4. Own site: ____              |                             |                                       |                              |                               |                                             |                                  |
| 4b. Own site: ____             |                             |                                       |                              |                               |                                             |                                  |
| E1. Install (optional)         |                             | install-to-result: / click-to-result: |                              |                               |                                             | Badge meaning:                   |
| E2. Wikipedia Allow (optional) |                             |                                       |                              |                               |                                             |                                  |
| E3. Sign-up: ____ (optional)   |                             |                                       |                              |                               |                                             | Clicked c3nsor unprompted: Y / N |

Wrap-up notes (most useful, most confusing, trust, would they remember to check, one change):
