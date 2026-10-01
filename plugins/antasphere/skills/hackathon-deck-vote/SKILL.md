---
name: hackathon-deck-vote
description: Make the team's vote presentation for the Antasphere Hackathon, the elevator pitch with the gaps filled that the other participants read on the Vote page before ranking the teams. Starts it from the organizer's Vote presentation template on Slideless, fills it from the repository and the demo's screenshots, checks it on a laptop and a phone, publishes it with a share link and registers that link with hackathon decks link --vote. Use when the participant says "vote presentation", "make our vote deck", "the deck for the vote", "set our vote link", "vote", or when the event says the vote presentation is due.
---

# The vote presentation: the elevator pitch, filled, hosted, linked

The other participants read it alone, on their phone or their laptop, in about a minute: the hackathon
app's Vote page shows it framed above the ballot. Every team fills the same sentence, so the teams
compare on the same grounds:

> For **who** who **need**, **Product** is **category** that **benefit**.
> Today, **alternative**. With **Product**, **difference**.

Six screens: the cover, who it is for, what it is (beside a screenshot), what changes, the moment
that proves it (beside a screenshot), the whole sentence with the team. It is not the pitch (the
stage, the `hackathon-deck-pitch` skill) and not the demo (the jury's episodes, the `hackathon-deck-demo` skill).

Work from the root of the team's clone; everything goes into `decks/vote/`. The scripts ship with this skill, in the `scripts/` folder beside this SKILL.md (call that folder
`$SKILL_DIR/scripts`; under Claude Code it is also `${CLAUDE_PLUGIN_ROOT}/skills/hackathon-deck-vote/scripts`, and after
`npx skills add` it is `~/.agents/skills/hackathon-deck-vote/scripts`): `fill.mjs` fills the deck, `check.mjs` checks it,
and `vote.example.json` shows the content filled for an invented tool.

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

Take the template titled `Vote presentation`. **When there is none, STOP**: tell the participant the
organizers have not published the event's templates yet (their `event-decks` guide does it) and to
ask one of them. Never build the deck any other way. Then, once:

```bash
slideless template start "Vote presentation" decks/vote/deck --workspace <id>
printf 'decks/*/deck/\ndecks/*/check/\n' >> .gitignore    # once per clone, if not there yet
```

`decks/vote/deck/` carries the Antasphere brand's typefaces, whose licence forbids a public
repository: it is never committed. The team's source is `decks/vote/vote.json` and the screenshots.
When `decks/vote/deck/` already exists, keep it: its `.slideless.json` is the link to the published
deck, so the next push is a new version of the same deck and the share link keeps working.

## 3. Gather, then ASK

Read the repository (the README, the routes, the dashboard's pages). When the `hackathon-deck-demo` skill ran, use its
screenshots in `decks/demo/screens/`: one for what it is, one for the moment that proves it. Without
them, take two screenshots of the running app (the `hackathon-deck-demo` skill's `play.mjs` does it).

Then ASK the participant, in ONE message, to confirm each gap, proposed from what you read, and read
the whole sentence aloud to them:

1. the product's name (24 characters at most) and its one sentence;
2. **who**: one kind of person; **need**: what goes wrong for them today;
3. **category**: what kind of thing it is, with its article ("a browser agent"); **benefit**: what it
   does for them;
4. **alternative**: what they do today without it; **difference**: what changes with it;
5. the moment to see, one sentence, and its screenshot;
6. the members' names, and a demo link anyone can open (`https://`), or none.

## 4. Fill and check

Write `decks/vote/vote.json` in the shape of `vote.example.json`: `lang` (`en`, `fr` or `nl`),
`occasion` (the event's name and date, from `hackathon event status --json`: its name and its start day, as `<name> · <day month year>`), `team`, `product`,
`oneLiner`, `pitch` (`who`, `need`, `category`, `benefit`, `alternative`, `difference`), `does.image`,
`moment` (`image`, `text`), `members`, `demoUrl`. Image paths are relative to `decks/vote/`. Each gap
must flow from the fixed word before it (French: `qui`; Dutch: `die`).

```bash
node "$SKILL_DIR/scripts/fill.mjs" vote decks/vote
node "$SKILL_DIR/scripts/check.mjs" decks/vote
```

`fill.mjs` exit 2, one line per problem (an empty gap, a text too long, a missing image, a link that
is not https): fix `vote.json`, run it again. `check.mjs` needs Playwright once per machine (exit 4
says how: `npm i --prefix ~/.cache/antasphere-hackathon/playwright playwright@1`, then `npx --prefix
~/.cache/antasphere-hackathon/playwright playwright install chromium`). It walks the six slides on a
laptop and the six screens on a phone, writes `decks/vote/check/laptop-N.png` and `phone-N.png`, and
prints `ok`. Exit 1, one line per problem: a text that runs out of its slide, a phone screen that
scrolls, a request outside the deck, an image that did not load, a deck over 5 MB. Shorten in
`vote.json`, fill, check again.

Open the screenshots with the participant (`open decks/vote/check` on macOS, `start` on Windows, `xdg-open` on Linux). A screen that says what the app
does not do is rewritten, never kept.

## 5. Publish and share

```bash
slideless push decks/vote/deck --title "<Team> · Vote" --template "Vote presentation" --no-open --json --workspace <id>
```

Read `presentation.id`. Then one link for the Vote page, with no expiry and no password (a password
link cannot be framed, and an expiry empties the Vote page):

```bash
slideless share <deck id> --name "Community vote" --json --workspace <id>
```

Read `url`: `https://<host>/v/<token>/`, shown once. A refusal about credits: an organizer tops the
organization up; say so and stop.

## 6. Hand the link to the platform

```bash
hackathon decks link --vote <url> --json
hackathon showcase set --product "<product>" --tagline "<oneLiner>" --json
hackathon decks show --json
```

The team is the signed-in participant's own. Exit 2: not a share link `https://<host>/v/<token>/`, or
a product name over 24 characters. Exit 1 with the platform's sentence: the link's host is not one the
Vote page can show (the sentence names the allowed host: publish on that Slideless), or voting has
opened and the vote presentation is fixed (an organizer can still replace it). Exit 3: sign in, or
not on a team. An older `hackathon` CLI without `--vote` or `--product`: `npm i -g
@antasphere/hackathon@latest`.

Commit `decks/vote/vote.json` and the screenshots it names, never `decks/vote/deck/` or
`decks/vote/check/`. Push before the freeze like any other work.

## Never

- Never build the deck without the organizer's template, and never copy the brand's files elsewhere.
- Never put a credential, a password or a real person's data in a screenshot or a screen.
- Never share the link with a password or an expiry.
- Never describe a feature the app does not have.
- Never pass a credential to `slideless` or `hackathon`: the Antasphere login does the work.
