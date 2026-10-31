# Validated Learning 2 — Michael Peterson (IS 581)

**Product:** c3nsor (Chrome extension + Try it page)  
**Round:** VL2 · **Due:** Sat Oct 31, 2026  
**Live Try it:** https://michael-peterson.com/IS-581/try.html  
**Extension install:** https://michael-peterson.com/IS-581/extension.html#install  
**Extension version tested:** 0.1.3 (quiet red toolbar badge)

---

## 1. MVP / what changed since VL1

### VL1 recap

VL1 tested a click-to-open privacy-policy checkpoint (extension / site). Testers (coworkers) liked the simpler read and design, but called out that clicking every time is painful and that many people won’t seek a policy on their own. Planned VL1 tweaks were: **proactive alerts**, a **time-saved counter in the product**, and more **pitch research**.

### Honest gap

Those VL1 tweaks were **not shipped** after VL1. The product stayed click-to-analyze until this VL2 cycle.

### What VL2 shipped (product update)

1. **Dynamic red toolbar badge (H1 quiet badge):** After the user clicks **Turn on red alerts** (optional site access), c3nsor re-checks when a tab finishes loading and shows a **red number** on the extension icon when policy checkpoints match. No full-page popup panel.
2. **Clearer in-UI alerts:** Alert pills in the popup and Try it page use high-contrast red (same language as the badge).
3. **How to use:** Extension and Try it pages document install → turn on red alerts → watch the badge → click for details.
4. **Verified install path:** Extension zip rebuilt; Load unpacked steps clarified (`manifest.json` folder).

### Still deferred

- In-page / every-site alert panels
- In-product time-saved counter UI (time saved is measured in sessions and reported below)
- Tracker blocking / “High risk” landing vision features

---

## 2. Data collected to measure success

| Metric                | How collected                                                                           | Target (directional)                            |
| --------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **M8 Time saved**     | Stopwatch: manual policy read + 3 questions vs Try it on rotated site                   | Median ≥ 60s saved; ≥ 50% faster                |
| **M2 Time to result** | Laps: link-to-result, analyze-to-result (Try it); install / click-to-result (extension) | Link-to-result median ≤ 60s                     |
| **M4 Comprehension**  | 3 core questions scored against citations                                               | ≥ 80% correct                                   |
| **Red badge notice**  | Extension track: badge seen without opening popup (Y/N); annoyance 1–5                  | Most notice; annoyance ≤ 2 median               |
| **M7 Intent**         | Survey likelihood 1–5 / disappointment                                                  | Median likelihood ≥ 4 or 40%+ very disappointed |

Core questions (same as VL1/metrics kit):

1. Does this site sell your data?
2. Can you opt out or delete your data? How?
3. Who does this site share your data with? Name one.

---

## 3. Process used to test

1. Moderated sessions (~20–28 min) using [`testing/session-script.md`](../testing/session-script.md).
2. **Try it track** for every tester (time-saved + comprehension).
3. **Extension track** for Chrome desktop testers: install → Turn on red alerts → observe red badge on navigation → open popup.
4. Stopwatch with laps; notes in the session grid; one row per tester in [`testing/results-log.csv`](../testing/results-log.csv).
5. Short post-session survey ([`testing/survey.md`](../testing/survey.md)).

Sites for time-saved rotation: duckduckgo.com ↔ wikipedia.org (Rotations A/B).

---

## 4. Who I tested with

**Requirement for a 5:** 3+ people who are actual potential customers — not close friends, family, or the VL1 coworker set alone.

| ID  | Who (initials / first name) | Why a real customer             | Track           |
| --- | --------------------------- | ------------------------------- | --------------- |
| T1  | _fill_                      | _e.g. signs up for SaaS weekly_ | try / extension |
| T2  | _fill_                      | _fill_                          | try / extension |
| T3  | _fill_                      | _fill_                          | try / extension |

Confirm: not close friends/family/team? **_Yes / No_**

---

## 5. Results (paste real numbers after sessions)

### Time saved (M8)

| Tester     | Manual site | Manual (s) | c3nsor site | c3nsor (s) | Seconds saved | Correct manual /3 | Correct c3nsor /3 |
| ---------- | ----------- | ---------- | ----------- | ---------- | ------------- | ----------------- | ----------------- |
| T1         |             |            |             |            |               |                   |                   |
| T2         |             |            |             |            |               |                   |                   |
| T3         |             |            |             |            |               |                   |                   |
| **Median** |             |            |             |            |               |                   |                   |

### Red badge (extension track)

| Tester | Turned on red alerts | Badge seen without click | Understood meaning | Annoyance 1–5 |
| ------ | -------------------- | ------------------------ | ------------------ | ------------- |
| T_     |                      | Y/N                      | Y/N                |               |
| T_     |                      | Y/N                      | Y/N                |               |

### Other

- Link-to-result median: ___ s
- Analyze-to-result median: ___ s
- Likelihood to use (median): ___ / 5

---

## 6. Key learnings (tie each to a metric + evidence)

1. **_Learning_** — Metric: _M8 / badge_ — Evidence: _e.g. “2 of 3 noticed the red badge without prompting”; quote_ — Meaning: _…_
2. **_Learning_** — Metric: _…_ — Evidence: _…_ — Meaning: _…_
3. **_Learning_** — Metric: _…_ — Evidence: _…_ — Meaning: _…_

Prompts: Did the red badge feel like enough without a popup? Did time saved hold with real numbers (unlike VL1)? Did anyone still ignore privacy for convenience?

---

## 7. Tweaks next

| Priority | Problem                           | Evidence        | Change                                  | Effort |
| -------- | --------------------------------- | --------------- | --------------------------------------- | ------ |
| 1        | _e.g. badge noticed but ignored_  | _session notes_ | Sign-up/consent **panel** (H1 option 3) | M      |
| 2        | No in-product proof of value      | VL1 request     | Time-saved **counter** in popup         | S–M    |
| 3        | Policy hard to find on some sites | VL1 + VL2 fails | Better discovery / paste UX             | M      |
| 4        | Pitch / positioning               | Quotes          | Market research on “before you sign up” | S      |

**Not changing this round:** full tracker blocking / landing “High risk” vision (roadmap, not MVP).

---

## Submit checklist

- [ ] Three moderated sessions logged in `results-log.csv`
- [ ] Numbers pasted into section 5
- [ ] Learnings filled with counts/quotes
- [ ] Export/copy this doc to PDF or Google Doc
- [ ] Upload to Canvas before Sat Oct 31, 11:59 PM
