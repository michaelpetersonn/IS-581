# Validated Learning 2 — Michael Peterson (IS 581)

**Product:** c3nsor (Chrome extension + Try it page)  
**Round:** VL2 · **Due:** Sat Oct 31, 2026  
**Live Try it:** https://michael-peterson.com/IS-581/try.html  
**Extension install:** https://michael-peterson.com/IS-581/extension.html#install  
**Extension version tested:** 0.1.4 (quiet red toolbar badge)

---

## 1. MVP / what changed since VL1

In VL1, testers liked the simpler policy read but said clicking the extension every time was painful. Planned tweaks (proactive alerts, time-saved counter) were not shipped immediately after VL1.

**VL2 product updates:**

1. **Dynamic red toolbar badge** — after “Turn on red alerts,” c3nsor checks on navigation and shows a red number on the icon when checkpoints match.
2. **Higher-contrast red alert pills** in the popup and Try it page.
3. **Clearer how-to-use / install path** (Load unpacked folder that contains `manifest.json`).

Still deferred: in-page alert panels; in-product time-saved counter UI (time saved measured in sessions below).

---

## 2. Metrics outlined and collected

| Metric | How measured | Success target | Result (this round) | Met? |
| --- | --- | --- | --- | --- |
| **Time saved** | Stopwatch: manual policy read + 3 questions vs c3nsor on a different site | Median ≥ 60s saved; ≥ 50% faster | Median saved **142 s**; ~**68%** faster | Yes |
| **Time to first result** | Seconds from opening Try it / clicking Analyze to five checkpoints | Link-to-result median ≤ 60s | Median link-to-result **38 s**; analyze-to-result **9 s** | Yes |
| **Red badge notice** | Saw red number without opening popup? Annoyance 1–5 | Most notice; annoyance ≤ 2 | **3 of 3** noticed; median annoyance **2** | Yes |
| **Intent to use** | Likelihood 1–5 after the session | Median ≥ 4 | Median likelihood **4** | Yes |

Core questions (both conditions): (1) Does this site sell your data? (2) Can you opt out/delete—how? (3) Who is data shared with—name one?

### Time saved detail (M8)

| Tester | Manual site | Manual (s) | c3nsor site | c3nsor (s) | Seconds saved | % faster | Correct manual | Correct c3nsor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Riley Pritzalaff | duckduckgo.com | 198 | wikipedia.org | 62 | 136 | 69% | 2/3 | 3/3 |
| Drew Gladwell | wikipedia.org | 225 | duckduckgo.com | 71 | 154 | 68% | 2/3 | 3/3 |
| Cody Netteshiem | duckduckgo.com | 187 | wikipedia.org | 58 | 129 | 69% | 3/3 | 3/3 |
| **Median** | — | **198** | — | **62** | **142** | **~68%** | — | **3/3** |

### Time to first result (M2) — Try it

| Tester | Link-to-result (s) | Analyze-to-result (s) |
| --- | --- | --- |
| Riley | 41 | 8 |
| Drew | 38 | 11 |
| Cody | 35 | 9 |
| **Median** | **38** | **9** |

### Red badge + intent

| Tester | Badge seen without click | Understood meaning | Annoyance 1–5 | Likelihood to use 1–5 |
| --- | --- | --- | --- | --- |
| Riley | Y | Y | 1 | 5 |
| Drew | Y | Y | 2 | 4 |
| Cody | Y | Y | 2 | 4 |
| **Summary** | **3/3** | **3/3** | **median 2** | **median 4** |

---

## 3. Who I tested with

Three potential customers (moderated sessions; Try it + extension red-badge check):

1. **Riley Pritzalaff** — nuclear policy worker for the state of Texas. Values security and clear language in high-stakes work; a real user of tools that must explain risk plainly.
2. **Drew Gladwell** — IS student who values privacy and is conscious about how his data/security is used; frequently evaluates new digital tools.
3. **Cody Netteshiem** — working professional who handles patient information and values security; represents someone who must be careful before trusting sites with sensitive data.

Process: timed manual policy read → same three questions with c3nsor on Try it → turn on red alerts and note whether the red badge appeared before opening the popup.

---

## 4. Key learnings (tied to metrics)

1. **c3nsor saves substantial time without hurting answers.**  
   Metric: time saved + comprehension. Evidence: median **142 s** saved (~**68%** faster); all three scored **3/3** with c3nsor vs mixed results manually. Meaning: the five-checkpoint summary is faster than skimming a full policy for the same questions.

2. **The red badge is noticeable and not very annoying.**  
   Metric: red badge notice / annoyance. Evidence: **3 of 3** saw the red number without opening the popup first; median annoyance **2/5**. Meaning: quiet background alerts address the VL1 “don’t make me click first” complaint for awareness—though people still need to open the popup for details.

3. **Intent to use is solid among security-conscious customers.**  
   Metric: intent (likelihood). Evidence: median **4/5**; Riley (high-stakes policy work) rated **5**. Meaning: positioning toward people who already care about security/privacy (policy, healthcare, IS) fits better than a general “everyone hates reading policies” pitch.

---

## 5. Tweaks next

| Priority | Tweak | Why (evidence) |
| --- | --- | --- |
| 1 | Short **alert panel on sign-up / cookie pages** (not every site) | Badge is noticed, but users still must click for the full report; VL1 asked for proactive help at decision moments |
| 2 | **In-popup time-saved counter** | Sessions show ~2+ minutes saved; surface that number in-product to reinforce value |
| 3 | Stronger **policy discovery / paste UX** | Some sites still need a pasted policy URL when the footer link is missing or script-heavy |
| 4 | Pitch: **“check before you share sensitive data”** | Resonated with Riley (policy) and Cody (patient info) more than generic privacy messaging |

**Not changing next:** full tracker blocking / homepage “High risk” vision (roadmap, not this MVP).
