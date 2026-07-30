---
name: agent-config-loading
description: What actually loads into context each session vs. what loads on demand — the constraint that decides where a rule belongs
type: reference
created: 2026-07-29
updated: 2026-07-29
valid_until: 2027-01-29
importance: 5
---

**Skills contribute only their `description` to every session. Their bodies load when invoked.
`CLAUDE.md` and `rules/*.md` load in full, every session.**

Observed directly: a session's context contained `~/.claude/CLAUDE.md` and `~/.claude/rules/codegraph.md`
complete, while all 19 skills appeared as one `name: description` line each.

Consequences that decide where a rule goes:

- **The description is the trigger.** A skill absent from the listing can only fire if someone names
  it. So a router may hide *user-invoked* phases, never *auto-applying* guardrails — hiding
  `db-safety` behind a router means nothing fires when someone writes a migration.
- Routing 8 phase skills saves ~250 tokens. That is not a reason to build a router. The reason is
  single-ownership of duplicated content — see [[cross-reference-drift]].
- A rule that must hold when no skill was invoked belongs in `WORKFLOW.md`, not a skill. That is the
  difference between a policy and a procedure, and why the commit-approval gate lives in both:
  the rule in `WORKFLOW.md`, the report formats in `sdlc/implement`.

Project-level `.claude/rules/*.md` with `paths:` frontmatter **do** load — verified in taiboli-app,
where an agent cited `frontend-components.md` unprompted and knew an unfixed instance in a file it
had not been pointed at.

Multiple `CLAUDE.md` files **merge**, home directory downward. There is no override semantics — two
files that disagree both land in context, and precedence comes from how strongly each is worded.

**Skills do NOT merge — same name across levels means one wins, silently.** Precedence is
enterprise → personal (`~/.claude/skills/`) → project (`.claude/skills/`), so **personal beats
project** — the opposite of the intuition that the more specific location wins, and the opposite of
what `product-analytics` claimed until 2026-07-30 (corrected). Confirmed in the Claude Code docs,
"Where skills live".

Consequence for the global/project split: a project skill must **never** reuse a user-level skill's
name, or it is shadowed and never loads — you get the agnostic rules with none of the repo's wiring
and no warning. Name it for what it adds (`observability-wiring`), so both load. Only *nested*
`.claude/skills/` below the cwd extend scope without colliding. Codex precedence for the same
collision is **unverified**; distinct names sidestep it on both hosts.
