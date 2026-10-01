---
name: coach-help
description: Help a hackathon coach (the platform calls them advisors) answer the teams' help requests. Lists what waits for a coach, reads a request and its thread, looks at the team's code in the local clone, drafts a reply the coach can post, and claims, posts, unclaims or resolves only on the coach's explicit word. Also lists every hackathon CLI command a coach may use. Use when a coach says "what's waiting", "open requests", "help team X with their request", "answer this request", "draft a reply", "claim it", "post it", "mark it resolved", "what can I do as a coach", or "which commands can a coach run".
---

# Help a coach answer a request

The `hackathon` CLI does every read and every act, with the coach's own sign-in, and prints JSON with
`--json`. This skill reads, looks at the code and drafts; **every write (a claim, a post, an unclaim, a
resolve, a reopen) waits for the coach's explicit OK on that exact act**, and a post shows its exact text
first. If `hackathon connect --json` does not answer with `eligibility.role` `advisor` or `organizer`, run
the `coach-brief` skill first: it signs the coach in and picks the event's workspace.

A refusal is `{ "ok": false, "error": { "code", "message" } }`: relay the message, never retry in a loop.

## 1. What waits

```bash
hackathon requests list --status open --limit 100 --json
hackathon requests list --status claimed --limit 100 --json
```

`requests[]`: `id`, `project.name` (the team), `title`, `status`, `claimedBy.name`, `createdAt`. Show the
open ones oldest first (the longest wait), then the ones claimed, with the claimer, and ASK which one to
take. Say when a request is already claimed by another coach: it is theirs until they let it go.

## 2. The request and its context

```bash
hackathon requests show <requestId> --json          # its team, status, body, and channelId: its thread
hackathon chats read <channelId> --limit 100 --json # the thread, newest first
```

Then the team's context, the way the `coach-brief` skill gets it (the team chat and its threads, the
repository cloned or pulled with `git pull --ff-only`). When the clone is already there, pull it and read
the files the request and the thread point to: the error quoted, the file named, the last commits
(`git log -n 10 --stat`). Reproduce only what is safe to run read-only (reading, a build or a test the
repository documents); never run a script that deploys, sends mail or spends a third-party key.

## 3. The draft

Write the reply for the team, plain text, 4000 characters at most, in the language the team wrote in:

- what is wrong, in one or two sentences, pointing at the file and the line;
- the fix: the smallest change, as a short snippet or a diff the team can apply, and how to check it;
- one question when something is missing to be sure.

Show the draft and ASK: post it as is, edit it, or keep it. Nothing is posted without that OK.

## 4. The acts, each on the coach's word

```bash
hackathon requests claim <requestId> --json         # take it, so the other coaches know (advisors only)
hackathon chats post <channelId> --file <draft.txt> --json   # post the reply in the request's thread
hackathon requests unclaim <requestId> --json       # let it go to another coach
hackathon requests resolve <requestId> --json       # mark it sorted
hackathon requests reopen <requestId> --json        # open it again (its claim cleared)
```

- Claim before working on an open request when the coach says so; `request_claimed` means another coach
  holds it: stop and say who (`claimedBy`).
- Post with `--file`: write the approved text to a temporary file first, so quotes and newlines arrive as
  they are. The request's thread is its own channel (`channelId`): post there, no `--thread`.
- A reply inside a thread of the TEAM chat (not a request) takes `--thread <postId>`, the thread's first
  post (`chats post --thread` came after the CLI 0.7.1; with an older CLI, post in the channel and quote
  the question).
- `request_resolved` on a post: the thread is read-only; ask whether to reopen it first.
- Resolve only when the coach says the team is unblocked, or the team said so in the thread.

After each act, read the request again (`hackathon requests show <requestId> --json`) and say its status.

## 5. The commands a coach may use

From `hackathon --help` and each group's `--help` (run them when unsure; the installed version decides):

| Command | What it does for a coach |
| --- | --- |
| `hackathon login`, `hackathon connect` | sign in once; check the place on the roster |
| `hackathon workspaces`, `hackathon workspace use <id-or-name>` | list the workspaces, pick the event's |
| `hackathon event status` | the phase, the deadlines, the freeze, the event's GitHub organization and branch |
| `hackathon event agenda show` | the programme of the day (after 0.7.1) |
| `hackathon chats list` | every channel a coach reads: general, every team's chat, every request's thread |
| `hackathon chats read <channelId>` | one page of a channel, newest first (`--limit`, `--cursor`) |
| `hackathon chats replies <channelId> <postId>` | the replies of one thread (after 0.7.1) |
| `hackathon chats post <channelId> <words>` or `--file <path>` | post; `--thread <postId>` replies in a thread (after 0.7.1) |
| `hackathon feed show`, `hackathon feed list`, `hackathon feed post` | the general channel, its pins, a post |
| `hackathon requests list` | every team's requests (`--status open|claimed|resolved`) |
| `hackathon requests show <requestId>` | one request, its team, its thread's channel |
| `hackathon requests claim <requestId>` | take a request (a coach only) |
| `hackathon requests unclaim <requestId>` | let a claimed request go (its coach, or an organizer) |
| `hackathon requests resolve <requestId>`, `reopen <requestId>` | sorted, or open again |
| `hackathon decks gallery` | every team with its description, its demo deck and presentation links |

Not a coach's: `requests open` (a participant's), `decks link` and `decks show` (a team's own links),
`submissions …` (a team's own or the organizers'), `setup` and `doctor` (a participant's team app),
everything under `admin` and the roster. Every command takes `--json`.

## Never

- Never post, claim, unclaim, resolve or reopen without the coach's OK on that act.
- Never push to a team's repository or commit in its clone; a fix goes to the team in the reply.
- Never put a secret, a key or a `.env` line in a draft; never ask the team to paste one in a chat.
- Never answer for another coach's claimed request without the coach saying so.
