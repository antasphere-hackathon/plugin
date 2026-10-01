---
name: vote
description: Make the team's vote presentation for the Antasphere Hackathon, the short deck the other participants read on the Vote page before ranking the teams. Starts it from the organizer's Slideless template, fills it from the repository and the demo screenshots, checks it on a phone and a laptop size, publishes it on Slideless with a share link and registers that link with hackathon decks link --vote. Use when the participant says "vote presentation", "make our vote deck", "the deck for the vote", "set our vote link", "vote", or when the event says the vote presentation is due.
---

# The vote presentation: filled, checked, hosted, linked

The other participants read it alone, on their phone or their laptop, in about 90 seconds: the
hackathon app's Vote page shows it embedded in a frame, and they rank the teams under it. It is not
the pitch (the stage talk for the jury) and not the demo (the jury's step-by-step). It is four to six
screens: the cover, the problem, what it does, the moment to try, how it is built (optional), why
vote for us.

The files ship with this skill: `${CLAUDE_PLUGIN_ROOT}/skills/vote/template/` is the deck itself
(`index.html`, its `AGENT.md`, two placeholder images), `scripts/render.mjs` fills it from a
`vote.json`, `scripts/check.mjs` checks it at both sizes, and `scripts/vote.example.json` shows the
content filled for an invented tool. Work from the root of the team's clone; everything goes into
`decks/vote/`.

## 1. Gather

Read the repository (the README, the routes, the dashboard's pages). When `/plugin:demo` ran, read
`decks/demo/demo.json` and look at `decks/demo/screens/`: its screenshots are real and already
taken, reuse them (one for what it does, one for the moment to try). Without them, take two
screenshots of the running app (the demo skill's `play.mjs` does it, or the participant does).

Then ASK the participant, in ONE message, to confirm the six things, each proposed from what you
read:

1. the product's name, one sentence of what it does, and for whom;
2. the problem: one real kind of person and what goes wrong for them today;
3. what it does, in three short lines;
4. the one thing to try that proves it is real;
5. how it is built, two or three plain lines, or nothing;
6. why vote for the team, one line, and the members' names.

Also ask for the demo link, if the team has an `https://` one a reader can open (or none).

## 2. Start from the organizer's template

Slideless must be signed in and in the event's workspace, as in `/plugin:demo`:

```bash
slideless whoami --json
```

The participant's `hackathon login` is the same Antasphere login. "No instance configured": pass
`--api-url https://slideless.antasphere.com` to every `slideless` command. A request to sign in: the
participant runs `hackathon login` in their own terminal. A refusal that the organization has no
access to Slideless: go to **If Slideless is not available**. `workspace.name` in
`hackathon whoami --json` is the event's organization; take the workspace with the same name in
`slideless workspaces --json` and pass `--workspace <its id>` to every `slideless` command below.
When none has that name, say so and ASK whether to use the default workspace.

```bash
slideless template list --json --workspace <id>
```

Take the template whose `title` starts with `Vote`, then:

```bash
slideless template start "<its title>" decks/vote/deck --workspace <id>
```

Read `decks/vote/deck/AGENT.md`: its `fill` block says what to change (the JSON block and the two
images) and what to keep (the engine). **When the workspace has no Vote template**, say so to the
participant: the deck is built from this skill's own copy of the template in step 3 instead.

## 3. Fill

Write `decks/vote/vote.json` in the shape of `vote.example.json`: `lang` (`en`, `fr` or `nl`),
`team`, `product`, `oneLiner`, `forWhom` (without the leading "For": the deck adds it), `problem` (`person`, `text`), `does` (`image`, `lines`:
one to three), `moment` (`image`, `text`), `built` (`lines`, or `null` to skip the screen), `why`
(`line`, `members`), `demoUrl` (`https://…` or `null`). Image paths are relative to `decks/vote/`,
so the demo's screenshots are `../demo/screens/03.jpg`. The team's own words, short: the limits are
set so every screen fits a phone.

With the organizer's template, fill the started deck in place:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/vote/scripts/render.mjs" decks/vote --into decks/vote/deck
```

Without it, build from the skill's own copy:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/vote/scripts/render.mjs" decks/vote
```

It writes `decks/vote/dist/`. Either way the content goes into the deck's `vote-content` JSON block,
the screens are written into the file, and the two images are copied to `assets/does.<ext>` and
`assets/moment.<ext>`. Exit 2, one line per problem: an empty field, too many lines, a text too long
for the screen, a missing image, a demo link that is not https. Fix `vote.json` and run it again.

## 4. Check both sizes

Playwright, once per machine (skip when `/plugin:demo` already installed it):

```bash
npm i --prefix ~/.cache/antasphere-hackathon/playwright playwright@1
npx --prefix ~/.cache/antasphere-hackathon/playwright playwright install chromium
```

Then:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/vote/scripts/check.mjs" decks/vote                           # the dist
node "${CLAUDE_PLUGIN_ROOT}/skills/vote/scripts/check.mjs" decks/vote --deck decks/vote/deck    # the template's deck
```

It opens the deck at 390 × 844 (a phone) and 1280 × 720 (a laptop), walks every screen and writes
`decks/vote/check/phone-N.png` and `laptop-N.png`. It prints `ok · 6 screens · 12 screenshots in
decks/vote/check/`. Exit 1, one line per problem: a request outside the folder, a page that scrolls,
a screen whose text does not fit, text under 16 px on the phone, dots that do not match the screens,
a key, a tap or a dot that does not move, an image that did not load, a cover that needs a script,
a deck over 5 MB. Exit 4: Playwright is missing.

Open the screenshots with the participant (`open decks/vote/check` on macOS). Whatever reads wrong
is fixed in `vote.json`, rendered and checked again. A screen that says what the app does not do is
rewritten, never kept.

## 5. Publish and share

```bash
slideless push decks/vote/deck --title "<Team> · Vote" --template "<template title>" --no-open --json --workspace <id>
```

Without the organizer's template, push `decks/vote/dist` and leave out `--template`. Read
`presentation.id` in the answer; the push writes `.slideless.json` in the folder, so a later push is
a new version of the same deck and the link keeps working. Then one link for the Vote page, with no
expiry and no password (a password link cannot be embedded, and an expiry before the results empties
the page):

```bash
slideless share <deck id> --name "Community vote" --json --workspace <id>
```

Read `url` in the answer: `https://<host>/v/<token>/`. It is shown once; keep it for the next step.
A refusal about credits: an organizer tops the workspace up; say so and stop.

## 6. Hand the link to the platform

```bash
hackathon decks link --vote <url> --json
hackathon showcase set --product "<product>" --tagline "<oneLiner>" --json
hackathon decks show --json
```

The second command puts the product's name (24 characters at most, the `product` of `vote.json`) and
its one sentence on the team's tile and above the deck on the Vote page: the other participants
recognise a tool by its name, not by the team's. An older `hackathon` CLI without `--product`: say so,
set the tagline alone, and tell the participant to update the CLI (`npm i -g @antasphere/hackathon@latest`).

The team is the signed-in participant's own; no `--team`. Exit 2: the link is not a share link of
the form `https://<host>/v/<token>/`, or the product name is longer than 24 characters. Exit 1 with the
platform's sentence: the link's host is not one the Vote page can show (the sentence names the allowed
host), or voting has opened and the vote presentation is fixed (an organizer can still replace it). Exit
3: sign in, or not on this team.

Commit `decks/vote/` without `dist/` and without `check/` (add both to the clone's `.gitignore`), so
the team keeps the source: `vote.json`, and `deck/` when it came from the template. Push it before
the freeze like any other work.

## If Slideless is not available

When the Slideless CLI cannot sign in, or the organization has no access to Slideless, do not stop:
steps 1, 3 and 4 do not need it. Build `decks/vote/dist/` from the skill's own template, check it,
commit `vote.json`, and tell the participant plainly what is missing: the deck is ready locally at
`decks/vote/dist/index.html`, and an organizer (or a coach) has to open Slideless to their
organization before it can be hosted and linked. Once that is done, run this skill again from step 2.

## Never

- Never put a credential, a password or a real person's data in a screenshot or a screen.
- Never share the link with a password or an expiry.
- Never add an external request to the deck: no webfont, no CDN, no remote image.
- Never describe a feature the app does not have.
- Never pass a credential to `slideless` or `hackathon`: the Antasphere login does the work.
- Never commit `~/.cache/antasphere-hackathon/` or anything from it.
