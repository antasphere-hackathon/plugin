# Antasphere Hackathon: the participant plugin

A Claude Code plugin for the participants of an Antasphere Hackathon. It drives the `hackathon`
command line (npm `@antasphere/hackathon`) and holds three skills:

| Skill            | What it does                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/plugin:join`   | From zero to your team's app running: installs the CLI, signs you in, sets your GitHub username, clones your team repository, starts the app. |
| `/plugin:check`  | `hackathon doctor` and its fixes, the app restarted when it is down, the phase and the deadlines, whether your last push was received.        |
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
plugins/plugin/skills/demo/scripts/      play.mjs (Playwright), render.mjs (the deck), demo.example.json
scripts/check.mjs                        the CI check: manifests, frontmatter, versions
```

A change to a skill bumps `version` in `plugins/plugin/.claude-plugin/plugin.json`; that version is
what Claude Code compares on update. `node scripts/check.mjs` runs in CI on every push.

## License

Fair-code, under the [Sustainable Use License](LICENSE), licensor Antasphere.
