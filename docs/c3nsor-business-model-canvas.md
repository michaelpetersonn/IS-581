# Business Model Canvas — c3nsor (IS 581)

**Designed for:** c3nsor  
**Designed by:** Michael Peterson  
**Date:** Nov 21, 2026  
**Version:** 1.0

Submit this file (or export to PDF/DOCX) on Canvas. The uploaded template PDF already contains the same content; this markdown is the readable source of truth.

---

## Value Propositions

**Job hired for:** Before you create an account, accept cookies, or share personal details, understand what a site’s privacy policy says — in one look, with checkable citations.

**Pain removed:** Privacy policies are long and ignored; people sign up anyway and get burned (spam, unexpected sharing, unclear opt-out/delete).

**Bundle:** Find the policy → five plain-English checkpoints (what’s collected, how used, who shared with, sale/sharing language, access/opt-out/deletion choices) + verbatim quotes → Open policy / Opt out / Copy email. Delivered as a Chrome extension plus a no-install Try it page.

**Why us / why now:** Local rules-based analysis (not black-box AI), private-by-design (no browsing telemetry), citations you can verify. Students and frequent sign-up users constantly create accounts for school, AI, and shopping tools while reading policies is still broken.

**Characteristics:** Convenience / usability + risk reduction + getting the job done.

---

## Customer Segments

**Type:** Niche market (not mass market).

**Beachhead — who feels it most:** University students and frequent sign-up users (P1) — school tools, AI apps, shopping, free trials.

**Secondary:** “Burned before” users (P2) — spam, breach, or surprise sharing made them hesitate at the next sign-up.

**Later:** Vendor / tool reviewers at work or clubs (P3) — B2B probe for who pays to monitor policies.

**Uses vs pays:** Users are individuals (often free/freemium). Paying customers are power users and/or later P3 orgs. Do not assume students pay until willingness-to-pay is validated.

---

## Channels

**Own digital channels** (web + browser store) — not retail or Amazon.

| Stage             | How                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| **Aware**         | Product site, campus word-of-mouth, clubs; later Chrome Web Store discovery                       |
| **Evaluate**      | Try it page (paste a URL → five checkpoints, no install)                                          |
| **Adopt / “buy”** | Free Chrome extension (Load unpacked zip → unlisted → listed Store); waitlist for vision features |
| **Deliver**       | In-browser analysis; Cloudflare Worker only fetches public HTML for Try it                        |
| **Support**       | In-product fallbacks (paste policy URL) + email                                                   |

---

## Customer Relationships

**Steady state:** Self-serve / product-led (no account required — fits a privacy brand).

- **Get:** Try it (zero friction) → install extension → optional red-alert toolbar badge.
- **Keep:** Fast comprehension at sign-up moments; local session cache; honest limits (“not legal advice”).
- **Grow:** Habit via quiet red alerts; later freemium limits / monitored sites.

**Early only:** High-touch moderated testing and email replies — not the long-term model.

---

## Revenue Streams

**What they pay for (hypothesis):** Ongoing convenience of trusted policy understanding + alerts/monitoring — not a one-off PDF summary.

**Near-term:** $0 while validating time-saved, comprehension, and retention.

**Model: Freemium → subscription**

- **Free:** Limited analyses / basic extension
- **Paid consumer:** Monthly/annual for higher limits, proactive alerts, sites monitored
- **Optional later B2B:** Vendors monitored (P3)

**Not ads** (conflicts with the privacy brand).

**Price sensitivity:** Students are highly price-sensitive → free tier must be strong; convert a minority of power users or move upmarket to P3.

**Plausible beat-cost:** Lean infra + small % paid (or a few B2B seats) covers Workers, Store fee, and founder time.

---

## Key Resources

**Hard to copy / stop-the-business assets:**

- **Intellectual:** Rules analyzer + citations; c3nsor private-by-design brand; validated-learning insights from tests
- **Human:** Founder/team who ship the product and talk to users
- **Cloud (not owned):** GitHub Pages, Cloudflare Worker; the user’s browser as the runtime
- **Financial:** Sweat equity; tiny cash (Chrome Web Store one-time fee)

**Not key now:** Patents, manufacturing plants, big sales force.

---

## Key Activities

**Category:** Problem-solving + software/platform (not physical production).

**Must do well every day:**

- Improve policy discovery and the five-checkpoint rules & citations
- Ship/maintain Chrome MV3 extension + Try it (same analyzer)
- Harden and operate the policy proxy
- User testing and validated learning
- Keep the privacy promise (no telemetry)

---

## Key Partnerships

**Deliberately not building:** Own browser, mail stack, CDN, AI cloud, or proprietary tracker database.

**Partners we depend on:**

- Chrome Web Store — distribution and install trust
- Cloudflare Workers — Try it policy fetches
- GitHub Pages — product site hosting
- Formspree — waitlist email
- Campus / clubs — beachhead testers

**Why:** Acquire infrastructure and reach we should not own yet; stay lean; reduce ops risk.

---

## Cost Structure

**Strategy:** Cost-driven / lean (student beachhead + privacy brand). Value-driven only if a later B2B tier needs premium support.

**Biggest costs:** Founder/team time (dominant); Cloudflare if traffic grows; Store fee; Formspree past free tier.

**Most expensive activities:** Analyzer quality, proxy safety, user testing — not ads or heavy servers today.

**Fixed:** Free hosting tiers; one-time ~$5 Store fee.  
**Variable:** Worker requests with volume.  
**No AI API spend in the MVP.**

**Scale:** Near-zero COGS per extra free user → economies of scale; same engine for everyone.

---

## Read-across check (assignment requirement)

| Side                 | Story                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Right (customer)** | Niche frequent sign-up / privacy-conscious users reached via Try it → extension → Store; self-serve relationships        |
| **Left (delivery)**  | Lean software: rules engine, proxy, Pages/Worker partners; no building a browser or AI cloud                             |
| **Bottom (money)**   | Free while validating → freemium subscription (not ads). Costs stay low so a small paid % can exceed infrastructure cost |

**Tensions surfaced (good — that is the point of the canvas):**

1. **Students feel the pain most, but may not pay** — free must be excellent; monetize power users or later B2B.
2. **Privacy brand vs growth channels** — no ad-funded model; growth via product and campus WOM is slower.
3. **Quiet red badge vs sign-up panels** — awareness without click vs needing richer alerts at decision moments (next product tweak).
