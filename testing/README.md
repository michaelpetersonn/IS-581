# c3nsor user-testing kit

**Goal:** Find out whether real customers can use the c3nsor MVP to understand a site's privacy policy in one look and act on it, using a small set of measurable metrics, then decide what to change.

**What's being tested:** only the MVP "Understand + light Act" checkpoint: find the policy, show five checkpoints with citations, and offer Open policy, Opt out, and Copy email. The home page shows the future vision (tracker blocking, cookie locking, "High risk" ratings, Delete/Leave), so don't send testers there.

**How testers use it:**

- **Try it page (primary, every tester):** https://michael-peterson.com/IS-581/try.html. Testers type any website and get the result. There's nothing to install, it works on a phone or laptop, and it's easy to run over a video call.
- **Chrome extension (optional track):** for testers on Chrome on a laptop or desktop who are willing to install version 0.1.1 from the zip (or from the Chrome Web Store once the unlisted listing is approved). It covers what only the extension shows: the badge, finding the policy for the page you're on, the Allow prompt, and the unprompted sign-up observation for the automatic-alert hypothesis.

**Privacy rule:** c3nsor has no telemetry, and testing must not add any. All metrics come from moderated sessions and a short survey.

## How the kit maps to the rubric

| Rubric item                                                   | File                                                                                       | What "done" looks like                                                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. MVP quality doesn't distract from feedback                 | [`mvp-readiness.md`](mvp-readiness.md)                                                     | Every Try it page check passes on the live site (plus the extension checks if you offer that track); decision made on each recommended fix.                                    |
| 2. Measurable key metrics outlined and collected              | [`metrics.md`](metrics.md), [`results-log.csv`](results-log.csv), [`survey.md`](survey.md) | Nine metrics with targets, including time saved versus reading the policy yourself; one filled-in log row and one survey response per tester.                                  |
| 3. Tested with 3+ real customers, not close friends or family | [`recruiting.md`](recruiting.md), [`session-script.md`](session-script.md)                 | At least 3 (ideally 5) screened testers matching a persona, each run through a moderated session, in person or by screen share. Unmoderated responses are extra evidence only. |
| 4. Learnings documented based on key metrics                  | [`learnings-and-tweaks.md`](learnings-and-tweaks.md)                                       | Results-vs-targets table filled in; 3 to 5 learnings, each tied to a metric with evidence.                                                                                     |
| 5. Tweaks to the prototype documented                         | [`learnings-and-tweaks.md`](learnings-and-tweaks.md)                                       | Prioritized tweak table (problem, evidence, change, metric, effort, status), a decision on the automatic-alert hypothesis (H1), and a plan for next round.                     |

## One-week plan

1. **Prep (day 1)**
   - [ ] Run the Try it page part of [`mvp-readiness.md`](mvp-readiness.md) on a laptop and a phone. Run the extension part only if you'll offer that track. Decide which recommended fixes to make first.
   - [ ] Build the Google Form from [`survey.md`](survey.md) and paste its link into [`session-script.md`](session-script.md).
   - [ ] Make the question card for the time-saved comparison and assign each tester slot a rotation (A for T1, T3, T5; B for T2, T4).
   - [ ] Do one practice session with a teammate (doesn't count as a tester), ideally over a video call, to check timing.
2. **Recruit (days 1 to 3)**
   - [ ] Send the screener and outreach message from [`recruiting.md`](recruiting.md). Lead with "no install, just a link." Book 5 sessions to end up with at least 3.
3. **Run sessions (days 3 to 5)**
   - [ ] Follow [`session-script.md`](session-script.md): about 22 minutes on the Try it track, or about 28 with the optional extension track, plus the survey. For remote sessions, see [`recruiting.md`](recruiting.md#running-remote-sessions).
   - [ ] Fill in one row of [`results-log.csv`](results-log.csv) within an hour of each session (delete the example row first).
4. **Analyze (day 6)**
   - [ ] Compute each metric from the log and survey; compare against the targets in [`metrics.md`](metrics.md). Report extension-track metrics only for testers who did that track.
   - [ ] Re-check comprehension answers on tester-chosen sites against the live policy.
5. **Write up (day 7)**
   - [ ] Fill in [`learnings-and-tweaks.md`](learnings-and-tweaks.md). Replace every `TBD`.

## Files

- [`mvp-readiness.md`](mvp-readiness.md): pre-testing quality checklist (Try it page first, extension optional) and recommended product fixes.
- [`metrics.md`](metrics.md): the nine metrics, how to measure them, and targets.
- [`recruiting.md`](recruiting.md): personas, screener, where to find testers, outreach message, remote and unmoderated sessions, consent.
- [`session-script.md`](session-script.md): moderator script for the Try it track and the optional extension track, answer key, note-taking grid.
- [`survey.md`](survey.md): post-session survey questions for Google Forms.
- [`results-log.csv`](results-log.csv): one row per session, with `session_type` (moderated or unmoderated) and `track` (try_page, or extension for testers who also did the extension track).
- [`learnings-and-tweaks.md`](learnings-and-tweaks.md): the final report template, including the automatic-alert hypothesis (not built).

This repo is public. Use tester IDs (T1, T2, ...) everywhere, and keep names, emails, and recordings out of it.
