---
name: hackathon-deck-pitch
description: Make the team's pitch presentation for the Antasphere Hackathon, the deck one member presents on stage to the jury in three to five minutes. Starts it from the organizer's Pitch presentation template on Slideless, fills it from the repository and the demo's screenshots, checks it on a laptop and a phone, publishes it with a share link and registers that link with hackathon decks link --pitch. Use when the participant says "pitch", "our presentation", "the slides for the jury", "make our pitch deck", "set our presentation link", or when the pitches are near.
---

# The pitch: filled, hosted, linked

One member presents it on stage, projected, in three to five minutes; the jury scores on paper. Eight
slides, about thirty seconds each, one idea per slide: the claim on the slide, the explanation said
aloud. The cover, the problem, the one number that makes it real (optional), what was built (a
screenshot), how it works (a small diagram: what goes in, the agent, what comes out, the person who
checks), the live demo (the cue to switch to the app, its screenshot as the fallback), where it
stands, and the line the jury should remember.

Work from the root of the team's clone; everything goes into `decks/pitch/`. The scripts ship with this skill, in the `scripts/` folder beside this SKILL.md (call that folder
`$SKILL_DIR/scripts`; under Claude Code it is also `${CLAUDE_PLUGIN_ROOT}/skills/hackathon-deck-pitch/scripts`, and after
`npx skills add` it is `~/.agents/skills/hackathon-deck-pitch/scripts`): `fill.mjs` fills the deck, `check.mjs` checks it,
and `pitch.example.json` shows the content filled for an invented tool.

## 1. Slideless, in the event's workspace

```bash
npm i -g @antasphere/slideless@latest
slideless whoami --json
```

The participant's `hackathon login` is the same Antasphere login. It asks to sign in, or says "Run
`antasphere login`": the participant runs `hackathon login` in their own terminal, then again. A
refusal that the organization has no access to Slideless: STOP and tell the participant an organizer
has to open Slideless to the event's organization; nothing can be published before.

`workspace.name` in `hackathon whoami --json` is the event's organization; take the workspace with the
same name in `slideless workspaces --json` and pass `--workspace <its id>` to every `slideless`
command below. When none has that name, say so and ASK; never publish in a personal workspace.

## 2. Start from the organizer's template

```bash
slideless template list --json --workspace <id>
```

Take the template titled `Pitch presentation`. **When there is none, STOP**: tell the participant the
organizers have not published the event's templates yet (their `event-decks` guide does it) and to
ask one of them. Never build the deck any other way. Then, once:

```bash
slideless template start "Pitch presentation" decks/pitch/deck --workspace <id>
printf 'decks/*/deck/\ndecks/*/check/\n' >> .gitignore    # once per clone, if not there yet
```

`decks/pitch/deck/` carries the Antasphere brand's typefaces, whose licence forbids a public
repository: it is never committed. The team's source is `decks/pitch/pitch.json` and the screenshots.
When `decks/pitch/deck/` already exists, keep it: its `.slideless.json` is the link to the published
deck, so the next push is a new version and the share link keeps working.

## 3. Gather, then ASK

Read the repository (the README, the routes, the dashboard's pages). When the `hackathon-deck-demo` skill ran, use its
screenshots in `decks/demo/screens/`: one for what was built, one for the live moment. Without them,
take two screenshots of the running app (the `hackathon-deck-demo` skill's `play.mjs` does it).

Then ASK the participant, in ONE message, to confirm each slide's words, proposed from what you read:

1. the product's name (24 characters at most), its one sentence, the members;
2. the problem: one real kind of person, and what goes wrong for them today in one sentence;
3. one number that makes it real, its unit and where it comes from, or none;
4. what was built in one sentence, and its screenshot;
5. how it works: three short steps (which one is the agent), and the person who checks, or none;
6. the one moment shown live, its screenshot, and one line if the live demo fails;
7. what works today, what is not finished, what comes next;
8. the one line the jury should repeat, and a demo link anyone can open (`https://`), or none.

## 4. Fill and check

Write `decks/pitch/pitch.json` in the shape of `pitch.example.json`: `lang` (`en`, `fr` or `nl`),
`occasion` (from `hackathon event status --json`: its name and its start day, as
`<name> · <day month year>`), `team`, `product`, `oneLiner`, `members`, `problem` (`person`, `text`),
`stake` (`number`, `unit`, `text`) or `null`, `built` (`image`, `text`), `how` (`title`, `headline`,
`steps` with `title`, `sub` and `agent: true` on the agent's, `check` with `label` and `text` or
`null`), `demo` (`image`, `text`, `fallback`), `next` (`works`, `missing`, `then`), `close` (`line`,
`demoUrl`). Image paths are relative to `decks/pitch/`. Short words: the limits are set so each
slide reads from the back of the room.

```bash
node "$SKILL_DIR/scripts/fill.mjs" pitch decks/pitch
node "$SKILL_DIR/scripts/check.mjs" decks/pitch
```

`fill.mjs` exit 2, one line per problem: fix `pitch.json`, run it again. `check.mjs` needs Playwright
once per machine (exit 4 says how). It walks the eight slides on a laptop and the eight screens on a
phone, writes `decks/pitch/check/laptop-N.png` and `phone-N.png`, and prints `ok`. Exit 1, one line
per problem: a text that runs out of its slide, a phone screen that scrolls, a request outside the
deck, an image that did not load. Shorten in `pitch.json`, fill, check again. Open the screenshots
with the participant (`open decks/pitch/check` on macOS, `start` on Windows, `xdg-open` on Linux); open `decks/pitch/deck/index.html` to rehearse
(arrows, Page Up/Down for a clicker).

## 5. Publish and share

```bash
slideless push decks/pitch/deck --title "<Team> · Pitch" --template "Pitch presentation" --no-open --json --workspace <id>
slideless share <deck id> --name "Jury" --json --workspace <id>
```

Read `presentation.id`, then `url` (`https://<host>/v/<token>/`, shown once). No password and no
expiry: the jury opens it after the event. A refusal about credits: an organizer tops the
organization up; say so and stop.

## 6. Hand the link to the platform

```bash
hackathon decks link --pitch <url> --json
hackathon decks show --json
```

The team is the signed-in participant's own. Exit 2: not a share link `https://<host>/v/<token>/`.
Exit 1 with the platform's sentence: the link's host is not one the platform accepts (the sentence
names the allowed host). Exit 3: sign in, or not on a team.

Commit `decks/pitch/pitch.json` and the screenshots it names, never `decks/pitch/deck/` or
`decks/pitch/check/`. Push before the freeze like any other work.

## Never

- Never build the deck without the organizer's template, and never copy the brand's files elsewhere.
- Never put a credential, a password or a real person's data on a slide or in a screenshot.
- Never a mock-up passed off as the app; never a feature the app does not have.
- Never share the link with a password or an expiry.
- Never pass a credential to `slideless` or `hackathon`: the Antasphere login does the work.
