---
name: hackathon-doctor
description: Open every hackathon working session. Reads the event clock first and says the time left to the build end and the freeze, runs hackathon doctor and walks the participant through every failed check, restarts the team app when it is down, confirms the platform received the last push, keeps the team's project description current, and sets the pacing for the rest of the session (small pushes, the 60/30/15-minute warnings, fixes only in the grace, the demo deck before the end). Use at the start of any session in a team repository, and when the participant says "check", "is my setup ok", "the app is down", "doctor", "how much time is left", "when is the freeze", "did my push count", "our idea changed", or when something in the setup looks wrong.
---

# Check the clock, the setup, the push and the pitch line

Run this at the start of every working session in the team's clone, before any other work: the
clock comes first, because a team that loses track of it loses its submission. The `hackathon` CLI
does the checks; this skill runs it, reads the `--json` answers and walks the participant through
the fixes. Run from the team's clone. If the participant never joined (no `hackathon` command, or
`hackathon connect` says to sign in), use the `hackathon-setup` skill instead.

## 1. The clock, first

```bash
hackathon event status --json
```

Read, from the answer: `phase` (`scheduled`, `building`, `grace`, `closed`), `serverTime`,
`event.buildEndsAt`, `event.freezeAt` (always the build end plus 15 minutes), `event.timezone`,
`event.lastReschedule` (the organizers moved the build end, with their reason), `me.project` (the
team: `id`, `name`) and, in the team's line of `projects[]`, `submission.repository.designatedBranch`
and `submission.lastReceipt` (`sha`, `receivedAt`, `late`).

Compute every time left from `serverTime`, never from this machine's clock. Then tell the
participant, in two or three lines, in the event's time zone:

- the phase, and the time left to the build end and to the freeze (for example: "Building. 3 h 12 min
  to the build end (17:00), 3 h 27 min to the freeze (17:15).");
- the rule, once per session: what counts is the last push to `<designatedBranch>` that the platform
  **received** before the freeze. There is nothing to click and nothing to submit; a commit on this
  machine is not a submission;
- a reschedule, if `event.lastReschedule` is set, with its reason.

If you are not sure the participant knows a deadline (a new session, a reschedule, a teammate who
joined late), ASK: "Do you know the build ends at 17:00 and the freeze is at 17:15?" Wait for the
answer before going on.

`scheduled`: say when the build starts; the setup can be checked now. `closed`: say the submission is
frozen (`submission.frozen.sha`), that nothing pushed now counts, and skip the pacing.

## 2. The doctor

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
- `credential` or `roster` (class `access`): use the `hackathon-setup` skill; it handles the sign-in.

Never run `sudo` or `gh auth login` for them: show the command and let them run it.

## 3. The app

If the `app` check failed because nothing answers on the port:

```bash
hackathon setup --directory . --json
```

It keeps the clone and its local changes, builds the image, starts the app and waits for its readiness
probe. Exit 4 "not ready in time": run the `docker compose … logs` command it printed and read the error
with the participant (a missing key in `.env` is the usual one; they paste keys there themselves, never
in the chat).

## 4. Did the platform receive the last push

```bash
hackathon submissions list --json
git rev-parse HEAD
git status --short --branch
```

A participant's answer has one line in `projects[]`: their team's. Compare its
`submission.lastReceipt.sha` with the local `HEAD`:

- the same: say it plainly ("The platform has your last commit, received at 14:32.");
- different, or `lastReceipt` null: the platform does not have this machine's work. If the local
  commits are meant to count, push to the designated branch now (the pacing below), then check again;
- `late` true: that push arrived at or after the freeze, is recorded, and never counts.

GitHub delivers a push to the platform in a few seconds, sometimes more. If the revision is not there
after a minute, `hackathon submissions show <me.project.id> --json` lists the receipts, refused ones
included; if it still does not arrive, open a request for an organizer (`hackathon requests open`).

## 5. The team's project description

Each team is a project of the event, and its description is the one line the organizers, the coaches
and the jury read about the team. Read it:

```bash
hackathon projects get <me.project.id> --json
```

Read `description` and `myRole`. The description needs work when it is empty, or stale: it no longer
matches what the repository and this session show the team is building (the README, the recent
commits, what the participant says now), or the participant says the idea changed.

1. ASK, in one question: "In one or two sentences, what are you building: the problem, for whom, and
   your approach?" Skip the question when they have just told you.
2. Propose a crisp description from their answer: one or two sentences, under 300 characters, the
   problem, who it is for and how, in their words, no marketing. For example, invented: "Cooks
   waste leftovers because recipes start from a shopping list. Fridgeful starts from a photo of the
   fridge and proposes three dinners that use what is already there."
3. Set it only on their OK.

Who sets it. `hackathon projects update` needs the **manager** role on the project, and a participant
is placed on their team's project as an **editor**, so the command is normally refused for them. So:

- `myRole` is `manager`: run
  `hackathon projects update <me.project.id> --description "<the agreed text>" --json`, then
  `hackathon projects get <me.project.id> --json` to read it back. A refusal with
  `insufficient_project_role` means the role changed: go to the next case.
- otherwise (the usual case): an organizer sets it. First `hackathon requests list --status open --json`:
  if the team already has an open request titled `Project description`, post the new text in its
  thread instead of opening another one (`hackathon requests show <id> --json` names the thread's
  channel; `hackathon chats post <channelId> --file <file>`). Else open one:

  ```bash
  hackathon requests open --title "Project description" \
    --body "Please set our team's description to: <the agreed text>"
  ```

  Tell the participant an organizer sets it, and read it again at the next check.

Keep it current: whenever the participant says the idea, the audience or the approach changed, run
this section again.

## 6. The pacing for the rest of the session

This section holds for the whole session, not only while this skill runs.

- **Push small and often** to `<designatedBranch>`: after every piece that works, and at least every
  30 to 45 minutes. Ask once per session: "May I commit and push to `<designatedBranch>` after each
  working step?" and push only with that OK; otherwise remind the participant to push at the same
  pace. Never force-push, never rewrite history.
- **Confirm the receipt** after each push: `hackathon submissions list --json`, `lastReceipt.sha`
  against `git rev-parse HEAD` (section 4). A push the platform did not receive is not a submission.
- **Read the clock** again (`hackathon event status --json`) before starting any task that takes more
  than a few minutes, and after each push. Warn the participant once as each mark passes:
  - **60 minutes** before the build end: say the time left; scope down to what can work by then;
    remind that the demo deck is due: the `hackathon-deck-demo` skill;
  - **30 minutes**: no new feature; make what exists work, push, confirm the receipt; the demo deck
    should be under way;
  - **15 minutes**: final push of the working state, confirm the receipt, finish the demo deck.
- **The grace** (`phase` `grace`, between the build end and the freeze): only fixes, no new work.
  Push each fix at once and confirm its receipt. Do not push in the last minute: a push GitHub
  accepts just before the freeze but that reaches the platform after it does not count.
- **Before the end**, if the demo deck is not linked yet (`hackathon decks show --json`), run
  the `hackathon-deck-demo` skill.
- If the organizers moved the build end (`event.lastReschedule`), say the new deadlines and their
  reason.

## Exit codes

0 done; 1 an API refusal outside the journey, such as `insufficient_project_role` on `projects update`
(read the `error.code`); 2 a flag is wrong; 3 access (a sign-in to do, not on the roster, no
repository yet, GitHub refused): the state has to change before a retry,
say who to ask; 4 the machine: install, start or free what the message names; 5 the folder is not the
assigned clone.

## Never

Never pass a credential to any command, never edit the remote URL, never `git reset --hard` or delete
files to make a check pass, never run a real `git push` to test access (the doctor's dry run does
that), never push without the participant's OK, never force-push.
