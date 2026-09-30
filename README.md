# Antasphere Hackathon: the participant plugin

A Claude Code plugin for the participants of an Antasphere Hackathon. It drives the `hackathon`
command line (npm `@antasphere/hackathon`) and holds three skills:

| Skill            | What it does                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/plugin:join`   | From zero to your team's app running: installs the CLI, signs you in, sets your GitHub username, clones your team repository, starts the app, then your project description and the deadlines. |
| `/plugin:check`  | The opening of every session: the clock first (time left to the build end and the freeze), `hackathon doctor` and its fixes, the app restarted when it is down, whether your last push was received, your project description kept current, and the pacing. |
| `/plugin:demo`   | Plays your running app with Playwright, takes the screenshots, builds the demo deck, hosts it on Slideless, sets its link on the platform.     |

## Install

In Claude Code:

```
/plugin marketplace add antasphere-hackathon/plugin
/plugin install plugin@antasphere-hackathon
```

Then say `/plugin:join` (or just "join the hackathon").

Updates: `/plugin marketplace update antasphere-hackathon`.

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
force-pushes, and pushes only with your OK.

## Layout

```
.claude-plugin/marketplace.json          the marketplace: one plugin, named "plugin"
plugins/plugin/.claude-plugin/plugin.json
plugins/plugin/skills/join/SKILL.md
plugins/plugin/skills/check/SKILL.md
plugins/plugin/skills/demo/SKILL.md
plugins/plugin/skills/demo/scripts/      play.mjs (Playwright), render.mjs (the deck), demo.example.json
scripts/check.mjs                        the CI check: manifests, frontmatter, versions
```

A change to a skill bumps `version` in `plugins/plugin/.claude-plugin/plugin.json`; that version is
what Claude Code compares on update. `node scripts/check.mjs` runs in CI on every push.

## License

Fair-code, under the [Sustainable Use License](LICENSE), licensor Antasphere.
