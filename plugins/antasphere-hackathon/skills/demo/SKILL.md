---
name: demo
description: Make the team's demo deck for the Antasphere Hackathon jury, a page of one to three episodes showing the app working step by step with real screenshots. Plays the team's running app with Playwright and takes one screenshot per step, fills the organizer's Demo deck template on Slideless with the episodes, checks it, publishes it with a share link and registers that link on the hackathon platform with hackathon decks link --demo. Use when the participant says "demo", "make our demo deck", "screenshots of our app", "publish the demo", "set our demo link", or when the demo deck is due.
---

# The demo deck: played, shot, hosted, linked

The jury reads it alone, after the pitches. The app runs on the team's own machine and is not online,
so the jury never opens it: the deck shows it working instead. It is a page of one to three
**episodes**, each a short story of one thing the product does (two to six steps), every step one
action with the screen's exact labels, what the screen showed, and a screenshot Playwright took of the
running app. The jury opens a screenshot large and follows an episode step by step. A feature the app
does not have is never in it.

Work from the root of the team's clone; everything goes into `decks/demo/`. The scripts ship with this skill, in the `scripts/` folder beside this SKILL.md (call that folder
`$SKILL_DIR/scripts`; under Claude Code it is also `${CLAUDE_PLUGIN_ROOT}/skills/demo/scripts`, and after
`npx skills add` it is `~/.agents/skills/demo/scripts`): `play.mjs` (the Playwright play, copied into the
clone and completed for this app), `fill.mjs` (fills the organizer's template), `check.mjs` (checks the
page) and `guide.example.json` (the content filled for an invented tool).

## 1. The app is running

```bash
hackathon doctor --directory . --json
```

The `app` check must pass. If it does not, run the `check` skill first. The app's local URL is
`http://127.0.0.1:<port>`, the port being `app.port` of `hackathon.json` (or the one `hackathon setup`
printed when it was started with `--port`).

## 2. The episodes

Read the repository (the README, the routes, the dashboard's pages) and open the app, then ASK the
participant, in one message, to confirm, each proposed from what you read: the one sentence of what
the tool does and for whom; **one to three episodes**, each a title, a two-sentence situation (who the
reader is in it, what is already true) and its two to six steps; what was set up before (the account,
the data, what is invented); what the agent does on the computer and what a person still decides; and
what is not finished yet.

Write `decks/demo/guide.json` in the shape of `guide.example.json`: `lang` (`en` or `fr`),
`occasion` (from `hackathon event status --json`: its name and its start day, as
`<name> · <day month year>`), `team`, `members`, `title` (the product), `subtitle` (its one sentence),
`forWhom`, `app.url`, `intro`, `worlds` (`setup`, `agent`: `name`, `text`), `notFinished`,
`episodes[]` (`title`, `who`, `minutes`, `situation`, `steps[]`), `closing` (`title`, `text`). A step
is `do` (one action, the screen's exact labels between « »), `see` (what the screen shows after it),
`shot` (`screens/NN.jpg`, NN its number counted straight through the episodes: episode 1's steps are
01, 02…, episode 2's carry on), and for the play `path` (a page of the app to open) and `expect`
(texts that must be on the screen). A step whose picture would need a real account, a real payment or
a real message carries `noshot` (the reason, a few words) instead of `shot`. The team's own words, no
marketing.

## 3. Play it and take the screenshots

Playwright, once per machine (skip when the clone already has `playwright` in its `node_modules`):

```bash
npm i --prefix ~/.cache/antasphere-hackathon/playwright playwright@1
npx --prefix ~/.cache/antasphere-hackathon/playwright playwright install chromium
```

Copy the play into the clone and write its gestures:

```bash
cp "$SKILL_DIR/scripts/play.mjs" decks/demo/play.mjs
```

At the bottom of `decks/demo/play.mjs`, write one gesture per step number (`async 3({ page, open,
expect })`) that brings the screen to what the step's `see` says, with Playwright's own locators
(`getByRole`, `getByLabel`, `getByText`) read from the app's code. A step with only a `path` needs no
gesture. A gesture never deletes anything, never sends a real message or a real payment, and never
types a real credential: a demo shows, it does not spend.

If the app needs a sign-in, the participant signs in once by hand:

```bash
node decks/demo/play.mjs --login     # a browser opens: sign in, then close the window
```

The session is kept in `~/.cache/antasphere-hackathon/`, outside the repository. Then play:

```bash
node decks/demo/play.mjs             # --headed to watch it, --from 3 --until 5 to replay a range
```

It writes `decks/demo/screens/NN.jpg` and `decks/demo/results.json`. Exit 1 means a step failed: read
`results.json` (`missing` texts, `note`), open the screenshot, fix the gesture or the step's `see`,
and replay that range. Open every screenshot before going on: a `see` that is not true of its picture
is rewritten, never kept.

## 4. Slideless, in the event's workspace

```bash
npm i -g @antasphere/slideless@latest
slideless whoami --json
```

The participant's `hackathon login` is the same Antasphere login. It asks to sign in, or says "Run
`antasphere login`": the participant runs `hackathon login` in their own terminal, then again. A
refusal that the organization has no access to Slideless: STOP and tell the participant an organizer
has to open Slideless to the event's organization; the screenshots and `guide.json` are kept for
later.

`workspace.name` in `hackathon whoami --json` is the event's organization; take the workspace with the
same name in `slideless workspaces --json` and pass `--workspace <its id>` to every `slideless`
command below. When none has that name, say so and ASK; never publish in a personal workspace.

## 5. Start from the organizer's template, fill, check

```bash
slideless template list --json --workspace <id>
```

Take the template titled `Demo deck`. **When there is none, STOP**: tell the participant the
organizers have not published the event's templates yet (their `event-decks` guide does it) and to
ask one of them. Never build the page any other way. Then, once:

```bash
slideless template start "Demo deck" decks/demo/deck --workspace <id>
printf 'decks/*/deck/\ndecks/*/check/\n' >> .gitignore    # once per clone, if not there yet
```

`decks/demo/deck/` carries the Antasphere brand's typefaces, whose licence forbids a public
repository: it is never committed. When it already exists, keep it: its `.slideless.json` is the link
to the published deck. Then:

```bash
node "$SKILL_DIR/scripts/fill.mjs" demo decks/demo
node "$SKILL_DIR/scripts/check.mjs" decks/demo
```

`fill.mjs` copies `guide.json` and the screenshots into the deck and renders the page with the
template's own renderer. Exit 2, one line per problem (more than three episodes, an episode under two
steps, a step without its screenshot or a `noshot`, a text too long): fix `guide.json` or replay the
step, run it again. `check.mjs` opens the page with every episode open and its step player, and on a
phone, writes `decks/demo/check/`, and prints `ok`. Exit 1, one line per problem. Open the
screenshots with the participant (`open decks/demo/check`), or the page itself
(`open decks/demo/deck/index.html`).

## 6. Publish and share

```bash
slideless push decks/demo/deck --kind app --title "<Team> · Demo" --template "Demo deck" --no-open --json --workspace <id>
slideless share <deck id> --name "Jury" --json --workspace <id>
```

`--kind app`: the demo is a page that scrolls, not slides. Read `presentation.id`, then `url`
(`https://<host>/v/<token>/`, shown once). No password and no expiry: the jury opens it after the
event. A refusal about credits: an organizer tops the organization up; say so and stop.

## 7. Hand the link to the platform

```bash
hackathon decks link --demo <url> --json
hackathon decks show --json
```

The team is the signed-in participant's own. Exit 2: not a share link `https://<host>/v/<token>/`.
Exit 1 with the platform's sentence: the link's host is not one the platform accepts (the sentence
names the allowed host). Exit 3: sign in, or not on a team. The pitch and the vote presentation are
the two other links (the `pitch` skill, the `vote` skill); they reuse these screenshots.

Commit `decks/demo/guide.json`, `play.mjs`, `screens/` and `results.json`, never `decks/demo/deck/`
or `decks/demo/check/`. Push before the freeze like any other work.

## Never

- Never put a password, an API key or a real person's data in a screenshot or a step.
- Never a button or a link that asks the jury to open the app: it is not online.
- Never build the page without the organizer's template, and never copy the brand's files elsewhere.
- Never share the demo with a password or an expiry: the jury opens it after the event.
- Never pass a credential to `slideless` or `hackathon`: the Antasphere login does the work.
- Never commit `~/.cache/antasphere-hackathon/` or anything from it.
