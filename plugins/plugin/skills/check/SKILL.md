---
name: check
description: Check a hackathon participant's setup and read the event clock. Runs hackathon doctor, walks the participant through every failed check, restarts the team app when it is down, then gives the phase, the deadlines and the freeze by the server's clock and whether the platform received the last push. Use when the participant says "check", "is my setup ok", "the app is down", "doctor", "how much time is left", "when is the freeze", "did my push count", or when something in the setup looks wrong.
---

# Check the setup and the clock

The `hackathon` CLI does the checks; this skill runs it, reads the `--json` answers and walks the
participant through the fixes. Run from the team's clone when there is one. If the participant never
joined (no `hackathon` command, or `hackathon connect` says to sign in), use the `join` skill instead.

## 1. The doctor

```bash
hackathon doctor --directory . --json      # from the clone; without --directory it checks the default folder
```

It changes nothing. The answer is `{ ok, platform, checks: [{ name, ok, detail, fix?, cls? }] }`: Git and
its identity, Node.js 22, Docker, the daemon, Compose, the disk, the instance, the credential, the
roster, the repository, the GitHub access, the clone, a dry-run push, the installer, the app and
`hackathon.json`. For every check with `ok` false, show its `fix` and offer to walk the participant
through it on their system (`platform`: `darwin` is macOS, `linux`, `win32` is Windows). Run the doctor
again after each fix, until it exits 0.

- `git identity`: ask the name and email they want on their commits, then
  `git config --global user.name "<name>"` and `git config --global user.email "<email>"`.
- `push` refused: GitHub saw another account than the one on the roster. The participant accepts the
  invitation with the roster's account, or signs in to GitHub with it (`gh auth login`, which they run
  themselves).
- `credential` or `roster` (class `access`): use the `join` skill; it handles the sign-in.

Never run `sudo` or `gh auth login` for them: show the command and let them run it.

## 2. The app

If the `app` check failed because nothing answers on the port:

```bash
hackathon setup --directory . --json
```

It keeps the clone and its local changes, builds the image, starts the app and waits for its readiness
probe. Exit 4 "not ready in time": run the `docker compose … logs` command it printed and read the error
with the participant (a missing key in `.env` is the usual one; they paste keys there themselves, never
in the chat).

## 3. The clock

```bash
hackathon event status --json
```

Say the phase (`scheduled`, `building`, `grace`, `closed`) and the next deadlines in the event's time
zone, with the freeze instant: the build end plus 15 minutes of grace. What counts is the last push the
platform **received** before the freeze. Then:

```bash
hackathon submissions list --json
git rev-parse HEAD
```

Compare the team's last received revision with the local `HEAD`. If they differ and the local commits
are meant to count, say so: push to the team's branch now.

In the last hour before the build end, remind the participant that the demo deck is due:
the `demo` skill.

## Exit codes

0 done; 2 a flag is wrong; 3 access (a sign-in to do, not on the roster, no repository yet, GitHub
refused): the state has to change before a retry, say who to ask; 4 the machine: install, start or free
what the message names; 5 the folder is not the assigned clone.

## Never

Never pass a credential to any command, never edit the remote URL, never `git reset --hard` or delete
files to make a check pass, never run a real `git push` to test access.
