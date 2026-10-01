---
name: join
description: Join the Antasphere Hackathon from zero to the team's app running locally. Installs the hackathon CLI, signs the participant in with their Antasphere account, checks their place on the roster, sets their GitHub username, waits for them to accept the repository invitation, clones the team repository, starts the app and opens it, then gives the team its project description and states the deadlines and the pacing. Use when a participant says "join the hackathon", "set me up", "get started", "install the hackathon", "clone our team repo", or has just installed this plugin.
---

# Join the hackathon

The `hackathon` CLI does the deterministic work and prints every command it runs on stderr. This skill
only sequences the commands and reads their answers. It holds no credential: the participant's own
Antasphere login and their own GitHub access do the work.

Pass `--json` to every `hackathon` command and read the answer on stdout. A refusal is
`{ "ok": false, "error": { "code", "message" } }` with an exit code (the table at the end). Where a step
says ASK, ask the participant and wait: never guess their email, their GitHub username or their folder.

## 1. The CLI

```bash
npm i -g @antasphere/hackathon@latest
hackathon --version
```

This skill needs version 0.7.1 or later (the one-command Antasphere sign-in and `decks link`). An older
version prints a `login` help that talks about "an existing hck_ API key": then the event's CLI is not
published yet. Say so and stop; an organizer has to publish it. No Node.js: point to
https://nodejs.org (version 22 or later) and stop until it is installed.

## 2. Sign in (once per machine)

```bash
hackathon connect --json
```

- Exit 0: signed in already, go to step 3 with this answer.
- Exit 3 saying to run `hackathon login`: sign the participant in, in two commands. ASK their email:
  "Which email address have you been using with Antasphere? It is the one our emails, your invitation
  and the briefing call were sent to." Never guess it. Then say a code is on its way and run
  `hackathon login --email <email> --send-only`. When they paste the code, run
  `hackathon login --email <email> --code <code>`; it prints `Signed in as …`. A refused code has
  expired: send a new one with `--send-only`. (A CLI older than 0.8.1 has no `--send-only`: run
  `hackathon login --email <email>` and pass the code on its standard input.) Then run
  `hackathon connect --json` again.
- "This account has no access to Antasphere Hackathon in any of its organizations" (exit 3): not
  fixable here. The organizers must add the participant's email to the event. Say so and stop.
- `not_on_roster` (exit 3): the email signed in is not the one on the roster. If the participant used
  another email, run `npx @antasphere/cli logout` (it forgets the stored Antasphere login), then
  sign in again, as above, with the email on the roster. Otherwise an organizer
  adds them; stop.
- `event_not_configured` (exit 3): the event is not open yet. Stop and say to try again later.

Only for an instance an organizer named explicitly (not the cloud): `hackathon login --api-url <url>`,
then `hackathon connect --api-url <url> --json`.

`eligibility.eligible` false in the answer (an organizer, a coach, a jury member, or a participant not
on a team yet): there is no team app to set up. Say why, and stop.

## 3. GitHub access

Read `repository` in the connect answer. `repository.state` is `pending`: the organizers have not
created the team repositories yet. Stop and say to come back later. When it is `assigned`, read
`repository.access`:

- `standing` is `no_username`: ASK the participant's GitHub username, then
  `hackathon connect --github <username> --json` and read `repository.access` again.
  `github_login_taken` means another person on the roster named it: ask again, or an organizer fixes it.
- `standing` is `invited`: ask the participant to open `repository.access.invitationUrl`, signed in to
  GitHub as `repository.access.github`, and accept. Wait for their word, then
  `hackathon connect --json` again.
- `standing` is `none`, or `member` with `canPush` false: show `repository.access.fix`. An organizer
  has to act. Stop.
- `canPush` true, or `standing` `unknown` (GitHub did not answer): go on.

## 4. Clone and set up

ASK where the repository should go, and propose `defaultDirectory` from the connect answer
(`~/Antasphere/hackathon/<team>`). With another folder, pass `--directory <path>` to every command
below.

First clone without starting, because a team app usually needs its environment file first:

```bash
hackathon setup --no-start --json            # or: --directory <path>
```

The CLI checks the GitHub access, Git, Docker, the daemon and Compose, clones the repository (or keeps
an existing correct clone with its local changes) and writes the agent files. Exit 4 names what to
install or start (Docker Desktop not running is the usual one): relay the sentence, let the
participant do it, run the same command again. Exit 5: the folder is not empty and is not the clone;
ASK another folder, never delete anything.

**The environment file.** If the clone has a `.env.example` and no `.env`: copy it to `.env`, fill
every password or secret line that the app generates itself (for example
`POSTGRES_PASSWORD` and `AUTH_SECRET` with `openssl rand -hex 16`), and `chmod 600 .env`. Leave every
third-party API key empty and tell the participant which ones to paste into `.env` themselves (the
event's page says where each key comes from). Never ask them to paste a key into the chat, and never
print `.env`. An empty key does not stop the app; they can add it later and restart.

Then start:

```bash
hackathon setup --json                       # same --directory if one was chosen
```

It builds and starts the app from the repository's `hackathon.json` and waits for the readiness probe.
`app` null in the answer means the repository has no `hackathon.json` yet: nothing to start, which is
fine. Exit 4 "not ready in time": run the `docker compose … logs` command it printed and read the
error with the participant.

## 5. Open it

Open the local app (`app.url`) and the platform's dashboard (`dashboardUrl`) from the setup answer
(`open <url>` on macOS, `xdg-open` on
Linux, `start` on Windows). If the app asks to claim the instance on the first boot, the setup token is
in its log: `docker compose -p hackathon-<team> logs app | grep 'claim the instance'`, run from the clone.

## 6. The team's project description

Right after the app runs, give the team its one line: each team is a project of the event, and its
description is what the organizers, the coaches and the jury read about it. Take the project from
`hackathon event status --json` (`me.project.id`), then follow section 5 of the `check` skill ("The
team's project description"): ASK in one question what they are building (the problem, for whom, the
approach), propose a crisp description, and on their OK set it, or, as a participant is an editor
of their project and only a manager may change it, open the `Project description` request for an
organizer with the agreed text. If they do not know yet, say it can wait and the `check` skill will ask
again.

## 7. The clock and the pacing

Read `hackathon event status --json` and tell the participant the phase, the time left to the build
end and to the freeze (the build end plus 15 minutes) in the event's time zone, and the rule: what
counts is the last push to the designated branch (`submission.repository.designatedBranch` in the
team's line) that the platform **received** before the freeze; there is nothing to click. From here,
the pacing of the `check` skill section 6 holds: push small and often (at least every 30 to 45 minutes)
and confirm the receipt, warnings at 60, 30 and 15 minutes before the build end, only fixes in the
grace, the `demo` skill before the end.

Finish with one short summary: who they are, their team, the clone's folder, the local URL, the
dashboard URL, the deadlines, and the two next skills: the `check` skill at the start of every working
session (the clock, the setup, the push), the `demo` skill when the demo deck is due.

## Exit codes

- 0: done. Read the JSON.
- 2: a flag is missing or wrong. Read the usage the CLI printed.
- 3: access: a sign-in to do, not on the roster, no event yet, no team or repository yet, no push access
  on GitHub, or GitHub refused. The message says who to ask or what to run. Never retry in a loop: the
  state has to change first.
- 4: the machine: Git, its identity, Node.js, Docker, the daemon or Compose; the disk; the port taken; the
  app not ready. The message says what to install, start or free.
- 5: the folder is not empty and is not the assigned clone.

## Never

- Never pass a credential to the CLI: no GitHub token, no API key, no hub secret. It needs none.
- Never run a command that needs the participant's password (`sudo`) or their GitHub sign-in
  (`gh auth login`) for them: show it and let them run it.
- Never edit the clone's remote URL, never `git reset --hard`, never delete the clone to make a setup
  pass: run `hackathon setup` again, it resumes.
- Never run a real `git push` to test access: `hackathon doctor` proves it with a dry run.
