---
type: Template
title: Vote presentation
description: The four-to-six-screen deck the other participants watch on the Vote page, on a phone or a laptop, before ranking the teams.
tags: [hackathon, vote, template]
timestamp: 2026-09-30T23:51:50Z
purpose: >
  Let the other participants understand one team's product in about 90 seconds, alone, on their phone
  or their laptop, inside the hackathon app's Vote page, before they rank the teams. It is not the
  pitch and not the demo: it is read, not presented.
pages: [cover, problem, what it does, the moment, how it is built (optional), why vote for us]
fill:
  content: the JSON block `vote-content` in index.html, every field
  images: assets/does.* and assets/moment.*, real screenshots of the running app, replaced with the same names
  keep: the engine (everything outside the JSON block), the dots, the navigation, the sizes
  accent: the --accent custom property may change; --paper and --ink stay readable
---

# Vote presentation

This deck is the model for a team's vote presentation. The other participants open it on the
hackathon app's Vote page, embedded in a sandboxed frame, and read it on their own in about 90
seconds before they rank the teams. It shows no presenter bar, asks for no password and has no
speaker: what is on the screen is all they get.

## What to change

Only two things.

1. **The JSON block** `<script type="application/json" id="vote-content">` in `index.html`:

   | Field                  | What it holds                                                     | Limit              |
   | ---------------------- | ----------------------------------------------------------------- | ------------------ |
   | `lang`                 | `en`, `fr` or `nl`: the language of the screens' own labels       |                    |
   | `team`                 | the team's name, small on the cover                               | 40 characters      |
   | `product`              | the product's name, the cover's display line, also on the Vote page's tiles | 24                 |
   | `oneLiner`             | what it does, one sentence                                        | 140                |
   | `forWhom`              | for whom, after "For"                                             | 80                 |
   | `problem.person`       | one real kind of person, by first name and what they do           | 80                 |
   | `problem.text`         | what goes wrong for them today                                    | 200                |
   | `does.image`           | the screenshot of what it does                                    | a file in assets/  |
   | `does.lines`           | what it does, one to three lines                                  | 90 each            |
   | `moment.image`         | the screenshot of the one thing to try                            | a file in assets/  |
   | `moment.text`          | the one thing to try                                              | 140                |
   | `built`                | `{ "lines": [...] }`, one to three lines, or `null` to skip it    | 90 each            |
   | `why.line`             | why vote for this team, one line                                  | 120                |
   | `why.members`          | the members' names                                                | 1 to 8             |
   | `demoUrl`              | an `https://` link to try the product, or `null`                  |                    |

2. **The two images** `assets/does.*` and `assets/moment.*`: real screenshots of the running app,
   under the same names (the extension may change: `.jpg`, `.png`, `.webp`, `.gif` or `.svg`).

The screens are rendered from the JSON by the engine at load, and also written into the file between
`<!-- screens:start -->` and `<!-- screens:end -->` so the cover shows even before a script runs.
The participant plugin's `render.mjs --into <this folder>` does both from a `vote.json`; editing the
block by hand works too, the engine re-renders on load.

The look may change in one place: `--accent` at the top of the CSS. `--paper` and `--ink` may be
adjusted only if the text stays plainly readable on the paper.

## What to keep

The engine, which is everything outside the JSON block: one screen at a time filling whatever frame
it is given (a 16/9 laptop frame, a 4/5 phone frame, anything between), no page scroll, the image
beside the text in landscape and above it in portrait, the dots, the `2 / 6` counter, the tap zones
(right 60% next, left 40% back), the keys (arrows, Space, Page Up/Down, Home, End), the swipe, the
quiet fade, and nothing that moves on its own. Sizes are set for the phone: body text never under
16 px on a 390 px wide frame.

## The rules

- Real screenshots only, taken on the running app. A feature the app does not have is never in the
  deck.
- The team's own words. No marketing, sentence case, short lines.
- No credential, no password, no real person's data in a screenshot.
- No external request of any kind: no webfont, no CDN, no remote image, no analytics. Everything is
  in this folder.
- No audio, no video, no autoplay.
- Under 5 MB in total: compress the screenshots.
- The first screen is readable with no interaction.
- Checked at both sizes, 390 × 844 and 1280 × 720, before it is published (the plugin's `check.mjs`
  does it and writes one screenshot per screen).

## Never

- Never add a link other than `demoUrl`.
- Never add a screen or remove one other than "how it is built" (`built: null`).
- Never share it with a password (a password link cannot be embedded) or an expiry (the Vote page
  goes blank when the link expires).
