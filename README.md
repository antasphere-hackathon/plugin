# Antasphere Hackathon: the participant plugin

A Claude Code plugin for the participants of an Antasphere Hackathon. It drives the `hackathon`
command line (npm `@antasphere/hackathon`) and holds five skills:

| Skill            | What it does                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/plugin:join`   | From zero to your team's app running: installs the CLI, signs you in, sets your GitHub username, clones your team repository, starts the app. |
| `/plugin:check`  | `hackathon doctor` and its fixes, the app restarted when it is down, the phase and the deadlines, whether your last push was received.        |
| `/plugin:demo`   | Plays your running app with Playwright, takes the screenshots, fills the organizer's Demo deck template (one to three episodes), hosts it on Slideless, sets its link on the platform. |
| `/plugin:pitch`  | Fills the organizer's Pitch presentation template (eight slides, three to five minutes on stage), checks it, hosts it on Slideless, sets its link on the platform. |
| `/plugin:vote`   | Fills the organizer's Vote presentation template (the elevator pitch with the gaps filled), checks it on a phone and a laptop, hosts it on Slideless, sets its link on the platform. |

The three decks start from templates the organizers publish in the event's Slideless workspace: the
plugin carries no deck of its own. Each skill ends with the deck's share link registered on the
platform (`hackathon decks link --demo | --pitch | --vote <url>`).

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
- For the decks: Slideless opened to your event's organization (the organizers do it) and the
  Slideless CLI (`npm i -g @antasphere/slideless`). Playwright is installed by the skills into
  `~/.cache/antasphere-hackathon/`, outside your repository.

The participant documentation is at [docs.antasphere.com](https://docs.antasphere.com), in the
Hackathon section.

## What this plugin never does

It holds no credential and asks for none. Your own Antasphere login and your own GitHub access do the
work. It never runs `sudo` or a GitHub sign-in for you, never rewrites your repository's history and
never pushes for you.

## Layout

```
.claude-plugin/marketplace.json          the marketplace: one plugin, named "plugin"
plugins/plugin/.claude-plugin/plugin.json
plugins/plugin/skills/join/SKILL.md
plugins/plugin/skills/check/SKILL.md
plugins/plugin/skills/demo/SKILL.md
plugins/plugin/skills/demo/scripts/      play.mjs (Playwright), fill.mjs, check.mjs, guide.example.json
plugins/plugin/skills/pitch/SKILL.md
plugins/plugin/skills/pitch/scripts/     fill.mjs, check.mjs, pitch.example.json
plugins/plugin/skills/vote/SKILL.md
plugins/plugin/skills/vote/scripts/      fill.mjs, check.mjs, vote.example.json
scripts/check.mjs                        the CI check: manifests, frontmatter, versions, scripts
```

Every skill carries its own scripts, because `npx skills add` installs a skill's folder alone: `fill.mjs` (a
started template filled) and `check.mjs` (laptop and phone, Playwright) are the same file in demo, pitch and
vote, and the CI check fails when the copies differ. A change to a skill bumps `version` in `plugins/plugin/.claude-plugin/plugin.json`; that version is
what Claude Code compares on update. `node scripts/check.mjs` runs in CI on every push.

## License

Fair-code, under the [Sustainable Use License](LICENSE), licensor Antasphere.
