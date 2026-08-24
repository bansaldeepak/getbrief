---
description: Git branch naming, push safety, and commit conventions. Applies to all git operations.
---

# Git Workflow

## Branch & Push Safety

**Never commit, push, or open a PR on your own — a human approves each one, every time.** Silence is not approval; approval for the last commit is not approval for this one; approval to commit is not approval to push.

Never commit or push to `main` — all changes via PR. Check `git branch --show-current` *before the first file write* in any lifecycle phase — not just before committing. If on `main`, STOP and branch first.

**Branch names:** `feature|fix|chore|hotfix/<name>`, pushed with `git push -u origin <branch>`. No force-push without explicit consent in the moment.

## Commit Convention

```
type(scope): subject

Task: S-NNN-T<N>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`, `ci`.

Task ID goes in commit body, not subject line.

## Rules

- One task = one commit (atomic unit of work)
- Story bookkeeping (status updates, summary) committed separately from implementation
- Never `git commit --no-verify` unless human explicitly requests it
- Never commit while a gate is open — unanswered gate = no
- Never push to main/master; warn if requested
