# CODE-AGENT-INSTRUCTIONS

Project-specific execution details for any coding agent working in this repo.

The **execution policy** — the approval gates, what to report before a commit, what to do when a
check fails or a spec is wrong — is global and lives in `/sdlc implement`. Do not repeat it here.
This file holds only what is true of *this repo* and would be wrong in another.

> Replace every `<…>` below with this repo's real commands and surfaces, then delete this line.

## Checks

Run before every gate-1 report:

```bash
<typecheck command>
<lint command>
<test command>
```

## Documentation Sync

```bash
<docs sync command>
```

<What it does, what it will and won't rewrite, and how a doc gets marked verified. If it can stamp
a "verified" date on its own, say so plainly — a tool that bumps the date for you turns the check
into a rubber stamp.>

## Database Changes

- Schema changes use `<migrate command>` — **never** `<push command>`, which leaves no migration
  file and breaks the deploy
- <Any other repo-specific migration rule>

Destructive operations follow the global `db-safety` rules regardless.

## What Push Triggers

<Which workflows fire on push, whether any of them deploy, and to which environment. This is why
gate 2 exists in this repo — name the actual consequence.>

## Verification Surfaces

| Area | How to verify |
|------|---------------|
| <feature area> | <URL + click path> |
| <feature area> | <file to read, what to look for> |

## Repo-Specific Prohibitions

- <anything this repo forbids that the global rules don't cover>
