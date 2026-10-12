---
id: TODO-010
title: brief v0.3 — Backlog & Roadmap (7 epics)
priority: P1
status: open
created: 2026-08-21
story: null
link: null
_brief:
  version: 1
  record_id: 8afa0839-744e-403e-9eb6-573dfe0bd951
  item:
    id: TODO-010
    type: todo
    title: brief v0.3 — Backlog & Roadmap (7 epics)
    status: open
    priority: P1
    created: 2026-08-21
    link: null
    pr: null
---

## What

Master backlog for brief v0.3 and surrounding tooling improvements. Seven epics, each to become its own story with PRD + TRD.

## Why

Current setup is globally bloated — every project inherits all skills/rules. Commands require multiple round-trips. Templates reference deprecated tooling (knowledge graph). Retros/context aren't searchable. Many skills are unused.

---

## Epic 1: Project-Scoped Architecture (De-bloating)

**Problem:** Global install means every project inherits everything whether relevant or not.

| # | Item | Detail |
|---|------|--------|
| 1.1 | Skills to project scope | Custom skills installed per-project by `brief init`, not symlinked globally |
| 1.2 | Rules to project scope | Rules like `db-safety` copied into project `.claude/rules/` during init based on detected tech |
| 1.3 | `brief init` installs skills | Detects tech stack (package.json, Cargo.toml, etc.) and installs relevant skills/rules locally |
| 1.4 | `brief setup` for Claude | Auto-detects or prompts: tech stack, coding style, conventions. Project-specific output |
| 1.5 | Self-improving coding-style rule | `.claude/rules/coding-style.md` that refines itself from developer choices |

---

## Epic 2: brief CLI — Command Enhancements

**Problem:** Commands create templates requiring multiple round-trips. Tracker state drifts.

| # | Item | Detail |
|---|------|--------|
| 2.1 | `log` stores full text | Accept multi-line body after frontmatter. Pipe support: `echo "text" \| brief log` |
| 2.2 | `context` create with content | Accept full markdown body, not just template scaffold |
| 2.3 | All `create` return file path | Print repo-relative path as parseable last line — standardize across all commands |
| 2.4 | Create accepts full markdown | `--body="markdown"` or stdin pipe. One command = one complete file |
| 2.5 | Task completion updates tracker | `status=completed` → set `current_task: null`, add `last_task` field |

---

## Epic 3: Templates & Agent Config

**Problem:** Templates reference knowledge graph (deprecated). AGENTS.md duplicated across providers.

| # | Item | Detail |
|---|------|--------|
| 3.1 | MEMORY template uses brief | "How to access" → `brief search` primary, file read fallback. No knowledge graph |
| 3.2 | AGENTS.md single file | One shared `AGENTS.md` in project root. Provider-specific appendixes only where needed |
| 3.3 | Provider appendix pattern | Small `.claude/CLAUDE.md` / `GEMINI.md` says "Read AGENTS.md" + delta only |
| 3.4 | Remove knowledge graph from init | No `.project/` creation, no `knowledge.db` references. Brief CLI = the system |

---

## Epic 4: Tracker & Story Structure

**Problem:** Retros and context aren't queryable. No versioning in tracker format.

| # | Item | Detail |
|---|------|--------|
| 4.1 | Retro as first-class entity | `documentation/retro/` folder, `R-001.md` format, `brief retro create`, searchable |
| 4.2 | Context as first-class entity | `documentation/context/` with IDs, `brief context create`, linked to stories |
| 4.3 | Tracker version field | `version: 0.3.0` header — enables migration across brief versions |
| 4.4 | Story record includes retro + context refs | Tracker entries get `retro:` and `context:` fields |
| 4.5 | One-time local migration | Script to move existing retros/context into new structure (not a product feature — run once per project) |

---

## Epic 5: Skills Cleanup & Consolidation

**Problem:** Many skills unused or better as rules. gstack installed but only 2 skills used.

| # | Item | Detail |
|---|------|--------|
| 5.1 | `documentation-standards` → rule | Convention, not invocable action |
| 5.2 | `db-safety` → rule | Remove skill duplicate. Project-specific only |
| 5.3 | `update-tracker` → deprecate | Brief handles tracker natively now |
| 5.4 | Assess rarely-used skills | `backend-standards`, `coding-standards`, `frontend-standards`, `observability`, `pre-mortem`, `product-analytics`, `first-principles` — merge into project rules or remove |

---

## Epic 6: SDLC PRD/TRD Enhancement

**Problem:** PRD/TRD miss rigor that gstack review gates enforce. Too much back-and-forth at review.

| # | Item | Detail |
|---|------|--------|
| 6.1 | Enhance discover skill | Ground in first principles. Agent surfaces findings, constraints, prior art — like gstack `office-hours` clearing the problem before solutioning |
| 6.2 | Problem definition gate | New skill/step between discover and PRD. Agent presents problem framing → human validates/refines → only then PRD begins. Prevents agents solutioning on incomplete understanding |
| 6.3 | Enhanced PRD template | Borrow from gstack `plan-ceo-review`: exec summary, stakeholder impact, success metrics, risk table |
| 6.4 | Enhanced TRD template | Borrow from gstack `plan-eng-review`: architecture decisions, scalability, dependencies, rollback |
| 6.5 | Self-review checklist | Completeness check before approval — missing sections require explicit skip justification |
| 6.6 | Inline review logic | Adapt gstack review prompts as optional SDLC gate (not full gstack dependency) |

---

## Epic 7: brief serve (Markdown Viewer)

**Problem:** Reading raw markdown in terminal isn't great for longer docs or onboarding.

| # | Item | Detail |
|---|------|--------|
| 7.1 | Separate optional package | `brief-serve` — not part of core. If missing, `brief serve` prints install instructions |
| 7.2 | Lightweight framework | Astro-like. Serves `documentation/` as rendered HTML with live reload |
| 7.3 | Navigation | Auto-generated sidebar, inter-doc links work, search |
| 7.4 | Zero config | `brief serve` → opens `localhost:3456` |

---

## Priority / Execution Order

| # | Epic | Effort | Why this order |
|---|------|--------|---------------|
| 1 | Epic 2: CLI Enhancements | S | Quick wins, immediate daily value |
| 2 | Epic 3: Templates & Agent Config | S | Fixes active confusion, small scope |
| 3 | Epic 1: Project-Scoped Architecture | L | Biggest structural win, larger scope |
| 4 | Epic 5: Skills Cleanup | M | Pairs with Epic 1 (do together) |
| 5 | Epic 4: Tracker & Story Structure | M | Adds queryability, moderate effort |
| 6 | Epic 6: SDLC Enhancement | M | Quality uplift, needs stable base first |
| 7 | Epic 7: brief serve | M | Independent, nice-to-have |

## Next Steps

Pick an epic → `brief story create` → PRD → TRD → tasks → implement.
Recommend starting Epic 2 (ship in one session) then Epic 3 + 1 together.
