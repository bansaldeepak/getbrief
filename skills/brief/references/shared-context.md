# Shared Context — Cross-Repo Workspace

A repo can join a **project**: a shared folder at `~/.brief/projects/<name>/` on this machine.
Agents in different repos use it as a bulletin board. It is a working surface, not permanent
storage — retro copies what matters into each repo's `documentation/memory/`, then cleans up.

Shared context is additive. If the repo has no `.brief/project.json`, skip this file.

## At phase entry (discover, plan, implement)

```bash
brief project status        # repos, shared items, stale warnings
brief search "<keywords>"   # also searches shared items of joined projects
```

Read the shared requirements, decisions and active work from other repos before you plan.
Do not contradict a shared decision silently. Raise it with the user.

If the repo is in several projects, add `--project=<name>`.

## At phase exit

Share what other repos must know. One file per item, same title updates the same file.

```bash
brief project share requirement "Auth API contract" --body="POST /token returns JWT"
brief project share decision "Use JWT tokens" --body="Why and what it affects"
brief project active "OAuth2 flow" --story=<feature>/S-001 --body="What is happening, what others need to know, blockers"
```

## At retro

```bash
brief project sync
```

This copies shared items into this repo's `documentation/memory/` and removes items marked
`resolved` and active work marked `done`. Mark finished items first:

```bash
brief project share decision "Use JWT tokens" --body="..." --status=resolved
brief project active "OAuth2 flow" --story=<feature>/S-001 --status=done
```

`brief project status` warns about items with no update for more than 7 days. Update or resolve them.
