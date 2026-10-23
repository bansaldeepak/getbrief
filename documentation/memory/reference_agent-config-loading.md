---
name: agent-config-loading
description: What actually loads into context each session vs. what loads on
  demand — the constraint that decides where a rule belongs
type: reference
created: 2026-07-29
updated: 2026-07-29
valid_until: 2027-01-29
importance: 5
_brief:
  version: 1
  record_id: d3acb0cf-379e-4253-8092-81cd0ae8f1cf
  item:
    id: reference_agent-config-loading
    type: memory
    title: What actually loads into context each session vs. what loads on demand —
      the constraint that decides where a rule belongs
    status: active
    link: null
    pr: null
---

**Skills contribute only their `description` to every session. Their bodies load when invoked.
`CLAUDE.md` and `rules/*.md` load in full, every session.**

Observed directly: a session's context contained `~/.claude/CLAUDE.md` and `~/.claude/rules/codegraph.md`
complete, while all 19 skills appeared as one `name: description` line each.

Consequences that decide where a rule goes:

- **The description is the trigger.** A skill absent from the listing can only fire if someone names
  it. So a router may hide *user-invoked* phases, never *auto-applying* guardrails — hiding
  `db-safety` behind a router means nothing fires when someone writes a migration. **Fixed
  2026-08-11**: moved the enforced rule set to `rules/db-safety.md` with `paths:` frontmatter
  (`**/migrations/**`, `prisma/schema.prisma`, `**/*.sql`, …) — confirmed working via the
  `prisma-migrations.md` precedent in taiboli-app. Loads in full whenever a matching file is touched,
  independent of whether the `db-safety` skill gets invoked. `WORKFLOW.md` was considered but
  rejected — it loads on every session in every project regardless of whether a database is even
  involved, so path-scoping in `rules/` is the better fit for a guardrail that isn't universal.
  `db-safety` (the skill) is now a thin pointer plus the one case path-scoping can't reach: destructive
  commands typed into a DB console with no file touched.
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
