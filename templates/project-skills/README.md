# Project Skill Templates

Stack-specific skills that are **only correct inside a repo that uses that stack**, so they don't
belong in the machine-global `~/.agents/custom-skills/`.

Nothing here is linked to any provider. These are copied into a project on purpose.

## Using one

Each host reads project skills from its own path, so link rather than copy twice:

```bash
mkdir -p <repo>/.claude/skills <repo>/.agents/skills
cp -r ~/.agents/templates/project-skills/<template> <repo>/.claude/skills/<name>
ln -s ../../.claude/skills/<name> <repo>/.agents/skills/<name>   # Codex reads .agents/skills
```

| Host | Repo-level skill path |
|------|----------------------|
| Claude Code | `<repo>/.claude/skills/<name>/SKILL.md` |
| Codex | `<repo>/.agents/skills/<name>/SKILL.md` (also cwd and parent dirs) |

Then edit it — paths, module names, and commands must match the repo it now lives in. Commit it
with the repo so every agent and teammate working there gets the same conventions.

## Never reuse a user-level skill's name

**A personal skill (`~/.claude/skills/`) overrides a project skill of the same name, silently.** So a
project skill called `observability` or `product-analytics` is shadowed by the global one and never
loads — you get the agnostic rules and none of the repo's wiring, with no warning.

Name the project one for what it adds: `observability-wiring`, `analytics-wiring`. Both then load,
which is the intent — global rules plus local specifics. Precedence across levels is
enterprise → personal → project; only *nested* `.claude/skills/` below the cwd add scope without
colliding.

## What goes here vs. global

| Global (`custom-skills/`) | Project (`.claude/skills/`) |
|---------------------------|-----------------------------|
| `coding-standards` — universal | The framework and its routing idiom |
| `backend-standards` — layer contracts, API design | The ORM and generated-type conventions |
| `frontend-standards` — component ladder, composition | The design system and its tokens |
| `observability` — signals, redaction, flush semantics | Which vendors, their env vars, sample rates |
| `db-safety`, `documentation-standards` | Test runner config, mock factories |
| | Build tooling, deploy target, background jobs |

The rule: if a statement would be **wrong** in another repo, it is a project skill.

## Available templates

| Template | For |
|----------|-----|
| `hono-react-router-prisma/` | Hono API + React Router SSR + Prisma, single worker/server |
| `hono-new-module/` | Scaffolding a new API module in the stack above |
