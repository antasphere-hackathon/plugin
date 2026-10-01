---
name: coach-brief
description: Brief a hackathon coach (the platform calls them advisors) on one team, fast. Signs the coach in with the hackathon CLI and picks the event's workspace, then pulls everything about the team, its chat and threads, its help requests and their threads, its demo deck and presentation links, clones or pulls its repository (coaches have read access to every team repository) and summarizes what the team builds, its stack, what it pushed recently, where it is stuck and what it asked. Use when a coach says "brief me on team X", "catch me up on <team>", "what is <team> building", "what are the teams doing", "pull the repo of <team>", "set me up as a coach", or before answering a team's request.
---

# Brief a coach on a team

The coach is signed in with their own Antasphere account; the `hackathon` CLI does every read and prints
JSON with `--json`. This skill sequences the reads and writes the summary. It never posts, claims or
resolves anything: that is the `coach-help` skill, on the coach's word. Where a step says ASK, ask the coach
and wait.

A refusal is `{ "ok": false, "error": { "code", "message" } }` with an exit code: 2 a flag is wrong,
3 access (a sign-in to do, not on the roster, no event), 1 another refusal the message names. Never retry
in a loop.

## 1. Sign in and the event's workspace (once per machine)

```bash
npm i -g @antasphere/hackathon@latest
hackathon --version
hackathon connect --json
```

- Exit 3 saying to run `hackathon login`: `hackathon login` is interactive (the Antasphere email, then the
  code mailed to it). ASK the coach to run it in a terminal of their own, with the email the organizers
  put on the roster, and to tell you when it printed `Signed in as …`. Then `hackathon connect --json`
  again.
- `not_on_roster` or "no access to Antasphere Hackathon": the organizers must add the coach's email.
  Say so and stop.
- `event_not_configured`: the account may be in several workspaces and this one holds no event. List
  them and pick the event's:

  ```bash
  hackathon workspaces --json          # { workspaces: [{ id, name, … }], selectedWorkspaceId }
  hackathon workspace use <id-or-name> # every later command runs there
  hackathon connect --json
  ```

  ASK which one when several could be the event's; never guess.

Read `eligibility.role` in the connect answer. `advisor` (a coach) or `organizer`: go on. `participant`:
this is not a coach account, point to the `join` skill and stop. `jury`: the jury does not read the chats;
stop. `eligible: false` is expected for a coach: a coach has no team app to set up.

## 2. The event and the teams

```bash
hackathon event status --json
hackathon chats list --json
hackathon decks gallery --json
```

- From `event status`: `phase`, `nextDeadline`, `event.freezeAt` (the build end plus the grace), the
  event's `timezone`, and `event.github.organization` and `event.github.designatedBranch` (where the team
  repositories live and the branch that counts). A coach's status lists no team: the teams come from the
  two reads below.
- From `chats list`: `channels[]` with `kind` `team` are the teams (`name` is the team, `projectId` its
  id, `id` the team chat's channel id); `kind` `request` are the help request threads (`projectId` names
  the team).
- From `decks gallery`: `entries[]`, one per team: `project.name`, `project.description` (what the team
  says it builds), `project.memberCount`, and `links.demo` / `links.pitch` (the demo deck and the
  presentation, Slideless share links, null until the team sets them).

No team named: give one line per team (name, description, members, open requests count from step 4) and
ASK which one to brief. Match the team the coach names case-blind against `name`; several match, ASK.

## 3. The team's chat, threads included

```bash
hackathon chats read <teamChannelId> --limit 100 --json
```

`posts[]` is newest first, with `author.name`, `authorRole` (`participant`, `advisor`, `organizer`),
`body`, `createdAt`, and on a thread's first post `replyCount`. Follow `nextCursor`
(`--cursor <nextCursor>`) while the posts are from the last six hours, then stop. For every post with
`replyCount` above 0:

```bash
hackathon chats replies <teamChannelId> <postId> --limit 100 --json   # oldest first
```

`chats replies` came after the CLI 0.7.1. If it answers "unknown command", update the CLI
(`npm i -g @antasphere/hackathon@latest`); if it is still unknown, say the thread replies are on the
dashboard's Chats page and go on without them.

## 4. The team's help requests

```bash
hackathon requests list --limit 100 --json
```

Keep the `requests[]` whose `project.id` is the team's. Each has `id`, `title`, `body`, `status`
(`open`, `claimed`, `resolved`), `claimedBy`, `openedBy`, `createdAt`, and `channelId`, its thread:

```bash
hackathon chats read <request.channelId> --limit 100 --json
```

Read every open and claimed request's thread; a resolved one only when it is from the last two hours.

## 5. The repository

A coach reads every team repository: the organizers' provisioning invites every coach whose GitHub
username is on the roster, with read access. Nothing on the platform names a team's repository to a
coach; GitHub does. The repository is `<organization>/<event>-<team>`, the team's name lower-cased,
accents dropped, every run of spaces or signs turned into one hyphen (a team "Night Owls" →
`…-night-owls`).

ASK the local folder once and propose `~/Antasphere/hackathon-coach/`; each team goes in its own
subfolder named like the repository.

With the GitHub CLI (`gh auth status` answers):

```bash
gh api /user/repository_invitations --jq '.[] | {id, repo: .repository.full_name}'
gh repo list <organization> --limit 200 --json name,url
```

- A pending invitation for a repository of the event's organization: ASK the coach before accepting
  (it acts on their GitHub account), then `gh api --method PATCH /user/repository_invitations/<id>` for
  each one they OK.
- The team's repository is the one of `gh repo list` whose name ends with `-<team-slug>`.

Without `gh`: the invitations wait on https://github.com/notifications (and by email); ASK the coach to
accept them, then try the name above with `git ls-remote https://github.com/<organization>/<name>.git`.

No invitation and no access at all: the roster has no GitHub username for the coach, or the organizers
have not run the provisioning since the coach was added. Say so: an organizer adds the username (Add
advisor, or the roster import) and presses Check again on the Admin page. Go on without the code.

Clone or update, never anything else:

```bash
git clone https://github.com/<organization>/<repo>.git <folder>/<repo>   # first time
git -C <folder>/<repo> pull --ff-only                                    # afterwards
git -C <folder>/<repo> log origin/<designatedBranch> -n 30 --date=iso --format='%h %ad %an %s'
```

The log on the designated branch is what the team pushed; the platform counts the last push it received
before `event.freezeAt`. A coach cannot read the platform's receipts (the submissions are the team's and
the organizers'); an organizer running this skill may add `hackathon submissions show <team> --json`
(the last received revision, the frozen evidence).

## 6. The summary

Read the repository's `README.md`, `hackathon.json`, the manifest files (`package.json`,
`pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `Dockerfile`, `docker-compose.yml`) and
the last commits' diffs (`git -C <dir> show --stat HEAD~5..HEAD`). Then write, short:

1. **What they build**: one or two sentences, from the description, the README and the code.
2. **Stack**: languages, frameworks, services, how it runs.
3. **Where they are**: the last pushes (count, last one's time against the freeze), what works.
4. **Where they are stuck**: open and claimed requests (title, who claimed it, age), the questions left
   unanswered in the chat, errors quoted in the threads.
5. **What they asked**: each request in one line, and what the thread already tried.
6. **Links**: the demo deck and the presentation (or "not set yet"), the clone's folder.

End with the next move: the `coach-help` skill to answer a request.

## Never

- Never post, claim, unclaim, resolve or reopen here.
- Never push, never commit in a team's clone, never `git reset --hard` or delete a clone: `pull --ff-only`
  only. A coach suggests a change in a reply; the team pushes it.
- Never pass a credential to a command, never print a `.env`, never paste a secret found in a repository
  into a summary: name the file and tell the coach to tell the team.
- Never read or summarize a team the coach did not ask about, beyond the one-line overview.
