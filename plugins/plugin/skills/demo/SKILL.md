---
name: demo
description: Make the team's demo deck for the Antasphere Hackathon jury. Plays the team's running app with Playwright and takes one screenshot per step, builds the demo deck from them, hosts it on Slideless with a share link, and registers that link on the hackathon platform with hackathon decks link. Use when the participant says "demo", "make our demo deck", "screenshots of our app", "publish the demo", "set our demo link", or when the demo deck is due.
---

# The demo deck: played, shot, hosted, linked

The jury plays the demo deck alone, after the pitches: one slide per step of the app's main flow, each
with what to do, a real screenshot and what you should see. This skill makes it from the running app,
never from imagination: every screenshot is taken by Playwright on the team's app, and a feature the
app does not have is never in the deck.

The scripts ship with this skill, in the `scripts/` folder beside this SKILL.md (call that folder `$SKILL_DIR/scripts`; under Claude Code it is also `${CLAUDE_PLUGIN_ROOT}/skills/demo/scripts`, and after `npx skills add` it is `~/.agents/skills/demo/scripts`). It holds `play.mjs` (the
Playwright play, copied into the clone and completed for this app), `render.mjs` (the deck's layout)
and `demo.example.json` (an invented example of the deck's content). Work from the root of the team's
clone; everything goes into `decks/demo/`.

## 1. The app is running

```bash
hackathon doctor --directory . --json
```

The `app` check must pass. If it does not, use the `check` skill first. The app's local URL is
`http://127.0.0.1:<port>`, the port being `app.port` of `hackathon.json` (or the one `hackathon setup`
printed when it was started with `--port`).

## 2. What the demo shows

Read the repository (the README, the routes, the dashboard's pages) and open the app, then ASK the
participant, in one message, to confirm: the one sentence of what the tool does and for whom, the main
flow in four to eight steps, the one thing to try that proves it is real, and what is not finished yet.
Propose each from what you read; they correct.

Write `decks/demo/demo.json` in the shape of `demo.example.json`: `title`, `team`, `lang`, `oneLiner`,
`forWhom`, `app` (`url`, `open`: how a juror opens the app, `signIn`), `steps[]` (`title`, `path`,
`do`, `see`, `expect`: texts that must be on the screen, `shot: false` for a step with no picture),
`tryThis`, `notFinished[]`. Put the screen's exact labels between backticks in `do` and `see`: they
render bold. The team's own words, no marketing.

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

At the bottom of `decks/demo/play.mjs`, write one gesture per step (`async 3({ page, open, expect })`)
that brings the screen to what the step's `see` says, with Playwright's own locators (`getByRole`,
`getByLabel`, `getByText`) read from the app's code. A step with only a `path` needs no gesture. A
gesture never deletes anything, never sends a real message or a real payment, and never types a real
credential: a demo shows, it does not spend.

If the app needs a sign-in, the participant signs in once by hand:

```bash
node decks/demo/play.mjs --login     # a browser opens: sign in, then close the window
```

The session is kept in `~/.cache/antasphere-hackathon/`, outside the repository. Then play:

```bash
node decks/demo/play.mjs             # --headed to watch it, --from 3 --until 5 to replay a range
```

It writes `decks/demo/screens/NN.jpg` and `decks/demo/results.json`. Exit 1 means a step failed: read
`results.json` (`missing` texts, `note`), open the screenshot, fix the gesture or the step's `see`, and
replay that range. Open every screenshot before going on: a `see` that is not true of its picture is
rewritten, never kept. The deck's promises are the app's, not the plan's.

## 4. Build the deck

**If the team's Slideless workspace has a demo template** (step 5 says how to read it: a template
whose title starts with `Demo` in `slideless template list --json`), start from it:
`slideless template start "<its title>" decks/demo/deck`, read its `AGENT.md` (its `fill` block says
what to change and what to keep), fill it from `demo.json` and the screenshots, and publish
`decks/demo/deck` in step 6 with `--template "<its title>"`.

**Otherwise** use the layout that ships with this skill:

```bash
node "$SKILL_DIR/scripts/render.mjs" decks/demo
```

It writes `decks/demo/dist/index.html` with the screenshots beside it. Open it (`open` on macOS) and
page through it with the participant before publishing.

## 5. Slideless: signed in, in the event's workspace

```bash
npm i -g @antasphere/slideless@latest
slideless whoami --json
```

The participant's `hackathon login` is the same Antasphere login: a current Slideless CLI is signed
in by it, with no second sign-in. Then:

- "No instance configured": an older Slideless CLI. Pass `--api-url https://slideless.antasphere.com`
  to every `slideless` command below.
- It asks to sign in, or "Run `antasphere login` once": sign them in with `hackathon login --email <email> --send-only` then
  `--code <code>` (the `join` skill says how), then `slideless whoami --json` again.
- A refusal from Antasphere that the organization has no access to Slideless: go to **If Slideless is
  not available** below.

Put the deck in the hackathon's workspace, not in a personal one. `workspace.name` in
`hackathon whoami --json` is the event's organization; `workspaces[]` (`id`, `name`) in
`slideless workspaces --json` lists the participant's Slideless workspaces. Take the one with the same
name and pass `--workspace <its id>` to every `slideless` command below. When no
workspace has that name, say so, and ASK whether to publish in the default workspace instead.

## 6. Publish and share

```bash
slideless push decks/demo/dist --title "<Team> · Demo" --no-open --json --workspace <id>
```

Read `presentation.id` in the answer. The push writes `decks/demo/dist/.slideless.json`, so a later
push of the same folder is a new version of the same deck and the link keeps working. Then one share
link for the jury, with no expiry and no password (the jury opens it after the event):

```bash
slideless share <deck id> --name "Jury" --json --workspace <id>
```

Read `url` in the answer: `https://<host>/v/<token>/`. It is shown once; keep it for the next step.
A refusal about credits: an organizer tops the workspace up; say so and stop.

## 7. Hand the link to the platform

```bash
hackathon decks link --demo <url> --json
hackathon decks show --json
```

The team is the signed-in participant's own; no `--team`. The presentation deck is the other link
(`--pitch`), made the same way when the team wants it. Exit 2: the link is not a share link of the
form `https://<host>/v/<token>/`.

Commit `decks/demo/` (without `dist/`, which the push rebuilt) so the team keeps the deck's source:
`demo.json`, `play.mjs`, `screens/`, `results.json`. Push it before the freeze like any other work.

## If Slideless is not available

When the Slideless CLI cannot sign in, or the organization has no access to Slideless, do not stop
the deck: steps 1 to 4 do not need Slideless. Finish `decks/demo/dist/`, commit it, and tell the
participant plainly what is missing: the deck is ready locally at `decks/demo/dist/index.html`, and
an organizer (or a coach) has to open Slideless to their organization before it can be hosted and
linked. Once that is done, run this skill again from step 5; the screenshots are kept.

## Never

- Never put a password, an API key or a real person's data in a screenshot or a slide.
- Never share the demo with a password or an expiry: the jury opens it after the event.
- Never pass a credential to `slideless` or `hackathon`: the Antasphere login does the work.
- Never commit `~/.cache/antasphere-hackathon/` or anything from it.
