# Antasphere Hackathon: the participant and coach plugin

A Claude Code plugin for the participants and the coaches of an Antasphere Hackathon. It drives the
`hackathon` command line (npm `@antasphere/hackathon`) and holds five skills:

| Skill            | What it does                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/plugin:join`   | From zero to your team's app running: installs the CLI, signs you in, sets your GitHub username, clones your team repository, starts the app, then your project description and the deadlines. |
| `/plugin:check`  | The opening of every session: the clock first (time left to the build end and the freeze), `hackathon doctor` and its fixes, the app restarted when it is down, whether your last push was received, your project description kept current, and the pacing. |
| `/plugin:demo`   | Plays your running app with Playwright, takes the screenshots, builds the demo deck, hosts it on Slideless, sets its link on the platform.     |
| `/plugin:coach-brief` | For coaches: signs you in, picks the event, pulls one team's chat, threads, requests and deck links, clones or pulls its repository, summarizes. |
| `/plugin:coach-help`  | For coaches: what waits, a request and its thread read against the team's code, a reply drafted; claims, posts, resolves only on your word.    |

## Install

In Claude Code:

```
/plugin marketplace add antasphere-hackathon/plugin
/plugin install plugin@antasphere-hackathon
```

Then say `/plugin:join` (or just "join the hackathon").

Updates: `/plugin marketplace update antasphere-hackathon`.

## For coaches

The platform calls a coach an advisor. A coach reads every team's chat and help requests and, once the
organizers have your GitHub username on the roster, every team's repository (read only: GitHub sends one
invitation per team repository; `/plugin:coach-brief` offers to accept them with the GitHub CLI).

Install the plugin as above, then:

- `/plugin:coach-brief` (or "brief me on team Night Owls"): the first run signs you in with your
  Antasphere account and picks the event's workspace; then it gathers the team's chat and its threads,
  its requests and their threads, its deck links and its repository (cloned under
  `~/Antasphere/hackathon-coach/` unless you choose another folder) and writes what the team builds, its
  stack, what it pushed, where it is stuck and what it asked.
- `/plugin:coach-help` (or "what's waiting", "help with this request"): lists the open requests, reads
  the one you pick against the team's code, drafts a reply, and claims, posts, unclaims or resolves only
  when you say so, each act on its own OK. It also lists every command a coach may run.

What a coach needs: Node.js 22 or later and Git; the GitHub CLI (`gh`) is optional and only used to list
and accept your invitations. Reading a team thread's replies (`hackathon chats replies`) and answering
inside a team-chat thread (`chats post --thread`) need a CLI newer than 0.7.1; without them the skills
say so and carry on.

## What you need

- Node.js 22 or later, Git, Docker Desktop (or Docker Engine with Compose).
- The email the organizers registered for you, and your GitHub account.
- For the demo deck: nothing more. Playwright is installed by the skill into
  `~/.cache/antasphere-hackathon/`, outside your repository.

## The clock and the pacing

What counts as your team's submission is the last push to your designated branch that the platform
received before the freeze (the build end plus 15 minutes of grace). There is nothing to click. So
`/plugin:check` opens every session with the time left, and the agent then paces the work: small
pushes at least every 30 to 45 minutes with the receipt confirmed, warnings at 60, 30 and 15 minutes
before the build end, only fixes during the grace, and `/plugin:demo` before the end. Run
`/plugin:check` first in every new session.

## Your project description

Your team is a project of the event, and its description is the line organizers, coaches and the
jury read about you. `/plugin:join` and `/plugin:check` ask what you are building, propose a crisp
description and, on your OK, hand it to an organizer through a help request (a participant is an
editor of their project; only a manager, which an organizer is, may change its description).

The participant documentation is at [docs.antasphere.com](https://docs.antasphere.com), in the
Hackathon section.

## What this plugin never does

It holds no credential and asks for none. Your own Antasphere login and your own GitHub access do the
work. It never runs `sudo` or a GitHub sign-in for you, never rewrites your repository's history, never
force-pushes, and pushes only with your OK. The coach skills never post, claim or resolve without your word,
and never push to a team's repository.

## Layout

```
.claude-plugin/marketplace.json          the marketplace: one plugin, named "plugin"
plugins/plugin/.claude-plugin/plugin.json
plugins/plugin/skills/join/SKILL.md
plugins/plugin/skills/check/SKILL.md
plugins/plugin/skills/demo/SKILL.md
plugins/plugin/skills/coach-brief/SKILL.md
plugins/plugin/skills/coach-help/SKILL.md
plugins/plugin/skills/demo/scripts/      play.mjs (Playwright), render.mjs (the deck), demo.example.json
scripts/check.mjs                        the CI check: manifests, frontmatter, versions, the README's skill table
```

A change to a skill bumps `version` in `plugins/plugin/.claude-plugin/plugin.json`; that version is
what Claude Code compares on update. `node scripts/check.mjs` runs in CI on every push.

## License

Fair-code, under the [Sustainable Use License](LICENSE), licensor Antasphere.
