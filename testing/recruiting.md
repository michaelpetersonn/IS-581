# Recruiting testers

Rubric item 3 requires at least 3 testers who represent actual customers and are not close friends or family. Aim for 5 so one no-show still leaves you above the minimum.

Testing is easy to say yes to: there's nothing to install. Testers open the Try it link (https://michael-peterson.com/IS-581/try.html) on their phone or laptop and type in websites. That makes remote sessions simple too. Installing the Chrome extension is an optional extra for testers who want to.

## Who counts as an actual customer

c3nsor is for people who create accounts often and care, at least a little, about what happens to their data. Recruit from these personas:

| Persona                        | Description                                                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1. Frequent sign-up           | Creates an account on a new site or app at least once a month (shopping, AI tools, school or work tools, streaming).                                                                    |
| P2. Burned before              | Has had spam, a data breach notice, or surprise data sharing, and now hesitates before signing up.                                                                                      |
| P3. Vendor reviewer (optional) | Picks or approves software at work, for example a small business owner, IT or operations staff, or a club officer choosing tools. Useful for the B2B "vendors monitored" pricing probe. |

Get at least two P1 or P2 testers. One P3 tester is a bonus.

**Exclude:** close friends, family members, roommates, partners, anyone on the c3nsor team, and anyone who helped build or review c3nsor. Acquaintances (a classmate from another course, a coworker you don't socialize with) are fine. If you're unsure, ask yourself: "Would this person hesitate to tell me it's bad?" If yes, don't use them.

**Device:** Any phone, tablet, or laptop with a current browser works for the main session. The optional extension track needs Chrome on a laptop or desktop and the tester's agreement to install a test extension.

## Screener

Send these questions before scheduling. Accept testers who match a persona.

1. About how often do you create an account on a new website or app? (Weekly / Monthly / A few times a year / Rarely)
   Accept: Weekly or Monthly (P1), or any frequency if question 2 qualifies them.
2. Have you ever had spam, a data breach notice, or data shared in a way you didn't expect after signing up somewhere? (Yes / No / Not sure)
   Accept: Yes (P2).
3. Before signing up, do you ever check what a site does with your data? (Always / Sometimes / Never, but I'd like to / Never and I don't care)
   Reject: "Never and I don't care."
4. Can you spare about 25 minutes on a video call or in person? What would you use? (Phone / Laptop or desktop with Chrome / Laptop or desktop with another browser)
   "Laptop or desktop with Chrome" means they can be offered the optional extension track.
5. Do you choose or approve software tools at work or for an organization? (Yes / No)
   Yes means P3.

Also confirm: "How do you know the person recruiting you?" Exclude close friends and family.

## Where to find testers

- Classmates in other courses, or IS 581 students outside your team (they're customers too, but note it in the persona column).
- Campus clubs: cybersecurity, information systems, entrepreneurship, computer science.
- Coworkers at a job or internship.
- Online privacy communities on Reddit or Discord. Read each community's rules first; many ban self-promotion and only allow research requests in specific threads. Remote sessions make these testers practical.
- LinkedIn post or message to second-degree connections.
- In person: the library or student center. Testers can use their own phone, so you don't need to bring a laptop.

## Outreach message

> Hi [name], I'm a student in IS 581 testing an early tool called c3nsor. You type in a website and it finds the site's privacy policy and shows what it says about your data in plain English, with quotes from the policy. There's nothing to install: it's just a link that works on your phone or laptop. I'm looking for people who sign up for new apps or sites often to try it for about 25 minutes, on a video call or in person, and tell me honestly what works and what doesn't. You don't need to know anything about privacy law. Would you have time this week? A quick 5-question form to see if it's a fit: [screener link]

## Running remote sessions

- Use any video call tool with screen sharing (Zoom, Google Meet, Microsoft Teams). Ask the tester to share their screen, or a single browser window, before Task 1.
- Laptop testers are easiest to observe. Phone testers can share their phone screen from the Zoom or Meet mobile app; if that's awkward, ask them to join the call on a laptop and still use the Try it page there.
- Paste links (site home pages, the Try it link, the survey) in the call chat. Show the question card by pasting it in chat or holding it up to the camera, then start the timer.
- Run the stopwatch on your own device and watch the shared screen for the moments to lap and stop.
- The optional extension track works remotely too, but only for testers on Chrome on a laptop or desktop who are comfortable installing while you watch.

## Optional unmoderated variant

If someone can't schedule a call, you can send them the Try it link, a short task list (check duckduckgo.com, then one or two sites they use), and the survey. For this variant, add the three core questions to the end of the Google Form so you get some comprehension data.

Keep this as supplementary evidence only. Without a moderator, you can't observe task success, time anything, or score answers against what the tester actually saw. Log these sessions as `unmoderated` in [`results-log.csv`](results-log.csv) and report them separately. The 3 or more real customers for the rubric should be moderated sessions so the metrics are observed, not self-reported.

## Consent and recording

Read this at the start of each session and get a verbal yes before continuing:

> "Thanks for helping. We're testing the product, not you, so there are no wrong answers. I'll take notes and time some tasks. [If recording:] May I record the screen and audio? Only our team will see it, and we'll delete it after the course. Your name won't appear in anything we write up; you'll be Tester T1, T2, and so on. You can stop at any time."

Data handling rules:

- The repo is public on GitHub, so never put names, emails, or recordings in it. Use tester IDs (T1, T2, ...) in [`results-log.csv`](results-log.csv) and [`learnings-and-tweaks.md`](learnings-and-tweaks.md).
- Keep the ID-to-name key and any recordings in a private team folder, and delete them after the course.
- Quotes in the write-up should not include details that identify the tester.
- Before screen sharing, testers should close or hide personal tabs and email.
