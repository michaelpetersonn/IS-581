# Key metrics

These metrics decide whether the c3nsor MVP works for real customers. They cover only the MVP: find a site's privacy policy, show five checkpoints with citations, and offer Open policy, Opt out, and Copy email. Home-page vision features (tracker blocking, cookie locking, "High risk" ratings, Delete/Leave) are out of scope.

Every tester uses the **Try it page** (https://michael-peterson.com/IS-581/try.html), which analyzes any website typed into it, with no install, on a phone or laptop. Some testers also do the optional **extension track** (Chrome on a laptop or desktop). Metrics marked "extension track" apply only to those testers. Record the track for every session.

## How we collect them

c3nsor has no telemetry or analytics, and the test must not add any. Every number below comes from one of two sources:

- **Moderated session:** the moderator watches, times tasks with a stopwatch, and records results in the note-taking grid in [`session-script.md`](session-script.md).
- **Post-session survey:** a short Google Form built from [`survey.md`](survey.md).

After each session, copy the numbers into one row of [`results-log.csv`](results-log.csv). Delete the example row before adding real data.

With 3 to 5 testers, results are directional, not statistically significant. Report raw counts alongside percentages (for example, "4 of 5 testers, 80%").

## Core question set

The same three questions are used for comprehension (M4) and time saved (M8):

1. "Does this site sell your data?"
2. "Can you opt out or delete your data? How?"
3. "Who does this site share your data with? Name one."

## Summary

| ID  | Metric                                       | Target                                                                                                                                                                  |
| --- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Task success rate                            | 80% or more of core tasks completed without help                                                                                                                        |
| M2  | Time to first result                         | Link-to-result median 60 s or less; analyze-to-result median 15 s or less. Extension track: install-to-result median 3 min or less; click-to-result median 10 s or less |
| M3  | Policy found rate (tester-chosen sites)      | 60% or more found from the typed home page (or with one Allow click in the extension)                                                                                   |
| M4  | Comprehension accuracy                       | 80% or more of answers correct                                                                                                                                          |
| M5  | Trust rating                                 | Median 4 or higher out of 5                                                                                                                                             |
| M6  | Action rate (north star)                     | 40% or more of analyses lead to an action                                                                                                                               |
| M7  | Intent to use                                | 40% or more "very disappointed", or median likelihood 4 or higher out of 5                                                                                              |
| M8  | Time saved                                   | Median 60 s or more saved per question set and 50% or more faster, with accuracy no worse than reading the policy                                                       |
| M9  | Willingness to pay and value unit (optional) | No pass/fail; recorded to inform pricing                                                                                                                                |

## M1. Task success rate

- **Definition:** Share of core tasks the tester finishes without the moderator stepping in. On the Try it track, core tasks are Tasks 2 to 4 in the session script (check a site on the Try it page, find an opt-out, own sites). Extension-track testers also have Tasks E1 to E3 (install, Wikipedia Allow, sign-up site), which replace Task 4. Task 1, reading a policy without c3nsor, is a baseline and doesn't count.
- **Why it matters:** If testers cannot complete the basic flow alone, nothing else we learn is reliable.
- **How it's measured:** For each task, the moderator marks Unaided, Assisted, or Failed. Assisted means the moderator gave any hint beyond repeating the task.
- **Target:** 80% or more of attempted tasks are Unaided, summed across all testers.
- **Recorded in:** `tasks_attempted`, `tasks_unaided` in the results log.

## M2. Time to first result

- **Definition:**
  - **Link-to-result (Try it track):** from the moment the tester opens the Try it link to the moment the five checkpoints appear for the first site they check (Task 2).
  - **Analyze-to-result (Try it track):** from clicking **Analyze** to the five checkpoints appearing. This includes downloading the site and its policy through the proxy.
  - **Install-to-result (extension track only):** from opening the install page (zip or Chrome Web Store) to the first findings in the popup on mozilla.org.
  - **Click-to-result (extension track only):** from clicking the c3nsor toolbar icon on mozilla.org to the five checkpoints appearing.
- **Why it matters:** The product promises a check before you sign up. If getting to a result is slow, people will skip it.
- **How it's measured:** Moderator stopwatch with laps (see Task 2 and Task E1 in the session script). Stop install timing at 5 minutes, help the tester, and mark install as Assisted.
- **Target:** Link-to-result median 60 seconds or less; analyze-to-result median 15 seconds or less (confirm a realistic number by timing yourself during the readiness check). Extension track: install-to-result median 3 minutes or less (Load unpacked is a developer flow; the Chrome Web Store version should be faster) and click-to-result median 10 seconds or less.
- **Recorded in:** `link_to_result_sec`, `analyze_to_result_sec`, `install_time_sec`, `ext_click_to_result_sec`.

## M3. Policy found rate on tester-chosen sites

- **Definition:** Share of sites the tester picks (sites they actually use or are about to sign up for) where c3nsor shows findings from the site's home page alone: typed into the Try it page, or checked with the extension (including one Allow click), without the tester supplying a policy URL or text.
- **Why it matters:** The four known-good demo sites prove the engine works. Tester-chosen sites show whether it works on the web people actually use.
- **How it's measured:** For each site, record one of: `auto` (found from the home page), `allow` (extension only: found after the Allow prompt), `paste` (worked only after the tester typed the policy URL or pasted its text), `open-only` (only the Open policy link worked), or `fail` (an error). Found = `auto` + `allow`.
- **Target:** 60% or more. Script-heavy privacy hubs like Meta/Instagram are a known limit, so 100% is not expected.
- **Recorded in:** `policy_result_per_site`, `own_sites_tried`, `own_sites_found`.

## M4. Comprehension accuracy

- **Definition:** Share of core questions (above) the tester answers correctly after looking at the c3nsor result (Try it page or extension popup), without opening the policy.
- **Why it matters:** The core value is understanding a policy in one look. If people misread the result, it fails even when the rules are right.
- **How it's measured:** Ask the core question set after each c3nsor analysis where the tester hasn't already read that site's policy: the Try it condition of the time-saved task (Task 2), and each tester-chosen site. Answers given in the manual-reading condition of M8 don't count here.

  Score each answer against what the result and its citation say (the moderator answer key in [`session-script.md`](session-script.md) covers the sample sites). On tester-chosen sites, the moderator checks the citation in the live policy with Ctrl+F or Cmd+F after the session.

  Count two kinds of misses separately: **tester misread** (the result was right and the tester got it wrong) and **c3nsor error** (the result itself was wrong or misleading). Both matter, but they lead to different tweaks.

- **Target:** 80% or more correct. Fewer than 1 in 10 answers affected by a c3nsor error.
- **Recorded in:** `comprehension_asked`, `comprehension_correct`, `c3nsor_errors`.

## M5. Trust rating

- **Definition:** Tester's 1 to 5 rating of "How much do you trust that c3nsor's findings reflect what the policy actually says?"
- **Why it matters:** People only act on findings they believe. Citations exist to build this trust.
- **How it's measured:** Survey question. In the wrap-up, ask what raised or lowered their trust.
- **Target:** Median 4 or higher.
- **Recorded in:** `trust_1to5`.

## M6. Action rate (north star)

- **Definition:** Share of successful analyses where the tester clicks Opt out, Open policy, or Copy email, or says they would take a specific action (opt out, read a section, not sign up, use a different email).
- **Why it matters:** This is the candidate north-star metric. Understanding a policy only matters if it changes what people do.
- **How it's measured:** The moderator counts every successful analysis and notes, for each one, whether the tester clicked an action button unprompted (`clicked`) or stated an action when asked "What, if anything, would you do now?" (`said`). The "Find an opt-out" task is prompted, so do not count it here.
- **Target:** 40% or more of analyses (clicked + said). Track clicked on its own as the stronger signal.
- **Note:** Some sites have no opt-out link or contact email (DuckDuckGo shows Opt out and Copy email greyed out). Record when an action was unavailable so it doesn't read as low interest.
- **Recorded in:** `analyses_count`, `actions_clicked_count`, `actions_clicked_which`, `actions_said_count`, `actions_unavailable`.

## M7. Intent to use

- **Definition:** Two survey questions:
  - Sean Ellis test: "How would you feel if you could no longer use c3nsor?" (Very disappointed / Somewhat disappointed / Not disappointed).
  - "How likely are you to use c3nsor before the next time you sign up for a new site or app?" (1 to 5).
- **Why it matters:** This shows whether the MVP is worth building on, and whether "check before you sign up" is a real habit.
- **How it's measured:** Survey. The optional email question ("tell me when the Chrome Web Store version is live") is a stronger commitment signal; count it too.
- **Target:** 40% or more answer "Very disappointed" (the common product-market-fit benchmark), or median likelihood 4 or higher. With 5 testers, 40% is 2 people.
- **Recorded in:** `disappointment`, `likelihood_1to5`, `left_email_Y_N`.

## M8. Time saved

- **Definition:** How much faster a tester answers the core question set with c3nsor than by reading the site's privacy policy themselves, with accuracy checked in both conditions.
- **Why it matters:** Reading a privacy policy takes too long, which is why people skip it. If c3nsor doesn't save meaningful time, or saves time by giving wrong answers, the core promise fails.
- **How it's measured:** Two timed conditions in the session, Task 1 and Task 2 (see [`session-script.md`](session-script.md#time-saved-comparison)). Every tester does both on the Try it page track, on the same device, whether or not they also do the extension track.
  - **Manual:** the tester starts on a site's home page, finds its privacy policy, and answers the three questions by reading it. Capped at 180 seconds. If the tester gives up or hits the cap, record 180 seconds and mark `timeout`. Unanswered questions count as incorrect.
  - **c3nsor (Try it page):** the tester opens the Try it link, types a different site, and answers the same three questions from the result, without opening the policy.
  - In both conditions, the moderator shows the three questions (on a card or in chat) before starting the timer, and stops the timer when the tester gives the last answer. Time includes finding the information: locating the policy (manual) or opening the Try it page, typing the site, and waiting for analysis (c3nsor). No Allow step is involved on the Try it page.
  - **Fairness:** the two conditions use different but comparable policies (DuckDuckGo and Wikimedia), swapped on alternate testers (Rotation A and B), so neither policy's length favors one condition. The manual condition always runs first, before the tester has seen c3nsor, so c3nsor's five-checkpoint layout can't teach them where to look in the policy. Showing the questions up front in both conditions removes the advantage of knowing the questions the second time. The remaining bias is small and works against c3nsor: the c3nsor condition is the tester's first time on the Try it page, so it includes finding the input box and typing the site, which will be faster on repeat use. That makes the result conservative.
  - **Accuracy:** score both conditions against the answer key, verified against the live policy text before testing.
- **Calculation:**
  - Per tester: seconds saved = manual seconds minus c3nsor seconds.
  - **Median seconds saved** per question set across testers.
  - **Percent faster** = 1 minus (median c3nsor seconds divided by median manual seconds).
  - **Accuracy** in each condition: correct answers out of 3, summed across testers. Also report the number of manual timeouts.
- **Target:** Median 60 seconds or more saved per question set, and 50% or more faster, while c3nsor-condition accuracy is equal to or higher than manual accuracy. If c3nsor is faster but less accurate, count the target as not met.
- **Perceived time saved:** a survey question asks how much time testers think c3nsor saves per site, to compare with the measured number.
- **Recorded in:** `timesaved_rotation`, `manual_site`, `manual_sec`, `manual_timeout_Y_N`, `manual_correct_of_3`, `c3nsor_site`, `c3nsor_sec`, `c3nsor_correct_of_3`, `seconds_saved`, `perceived_time_saved`.

## M9. Willingness to pay and value unit (optional)

- **Definition:** What testers would pay, and for which unit of value.
- **Why it matters:** It informs pricing. The value-metric candidates are sites monitored (consumers) and vendors monitored (B2B).
- **How it's measured:** Survey questions on price (too expensive / bargain per month) and which unit feels fairest: free with limits, pay per month for a number of sites monitored, or one-time purchase. For a tester who evaluates software vendors at work, also ask about vendors monitored.
- **Target:** None. Report the price range and the most chosen unit.
- **Recorded in:** `wtp_too_expensive_usd`, `wtp_bargain_usd`, `value_unit`.

## Hypothesis check: automatic alerts (not a metric yet)

The automatic-alert idea in [`learnings-and-tweaks.md`](learnings-and-tweaks.md#hypothesis-h1-no-click-needed-alerts-on-sign-up-and-consent-pages) is not built. On the extension track, the session records whether testers think to click c3nsor on a sign-up page without a prompt. Try it track testers get an interview question instead, and every tester answers survey questions on which alert style they'd prefer. These go in `signup_clicked_unprompted_Y_N`, `alert_preference`, and `signup_alert_annoyance_1to5`.
