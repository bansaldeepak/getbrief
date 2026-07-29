---
name: sdlc
description: "Router for the software lifecycle skills — discovery, PRD, TRD, planning, code review, retrospective, decision records, and memory curation. Invoke for any of: /sdlc, /discover, /prd, /trd, /project-plan, /pr-review, /retro, /decision-doc, /memory-review, or whenever work is starting on a feature, a plan or requirements are needed, a non-obvious choice needs recording, a branch is ready for review, or a story just merged."
user_invocable: true
argument-hint: "[discover|prd|trd|project-plan|pr-review|retro|decision-doc|memory-review]"
model: opus
---

# /sdlc — Lifecycle Router

Routes to one lifecycle phase. **This file owns the phase graph; the phase files own their own
procedures.** No phase file restates what comes next — that lives here and only here.

## Route

Read the file for the requested phase and follow it exactly. Do not summarize it, work from this
table, or answer from memory — the table below is an index, not a substitute.

| Phase | Read | Use when |
|-------|------|----------|
| `discover` | `~/.agents/custom-skills/sdlc/discover/SKILL.md` | Problem is vague, scope ambiguous, multiple readings exist |
| `prd` | `~/.agents/custom-skills/sdlc/prd/SKILL.md` | Problem is clear, requirements need defining |
| `trd` | `~/.agents/custom-skills/sdlc/trd/SKILL.md` | Architecture, schema, or API contracts change |
| `project-plan` | `~/.agents/custom-skills/sdlc/project-plan/SKILL.md` | Approved requirements need breaking into stories and tasks |
| `pr-review` | `~/.agents/custom-skills/sdlc/pr-review/SKILL.md` | Branch is ready for review, before a PR |
| `retro` | `~/.agents/custom-skills/sdlc/retro/SKILL.md` | A story merged |
| `decision-doc` | `~/.agents/custom-skills/sdlc/decision-doc/SKILL.md` | A non-obvious choice was made, any time |
| `memory-review` | `~/.agents/custom-skills/sdlc/memory-review/SKILL.md` | Memory needs flushing or curating, any time |

Invoked with no argument: infer the phase from the lifecycle position below, name your choice, and
proceed. If two phases are equally plausible, ask rather than guess.

## The Graph

```
discover → prd (🔒) → trd (🔒) → project-plan → implement → pr-review (🔒) → merge (🔒) → retro
             │          │                          │
      gstack plan-      gstack plan-           qa agent
      ceo-review        eng-review             per task
```

🔒 = **human approval gate.** Stop and get explicit approval. Never pass one on inferred consent.

**Plan-review gates** run through the gstack router: `/gstack plan-ceo-review` on the PRD after `prd`
and before `trd`; `/gstack plan-eng-review` on the TRD after `trd` and before `project-plan`.

### Entry point by scope

| Scope | Start at |
|-------|----------|
| Bug or under 30 minutes | Skip to implementation → `qa` → `pr-review` |
| Clear-scope feature | `prd` |
| Ambiguous problem | `discover` |
| Architecture unchanged | Skip `trd` |

### Off-graph, any time

`decision-doc` when a fork in the road gets resolved. `memory-review` when memory needs curating.
`/pre-mortem` before high-risk work — it auto-applies and isn't routed here.

## After a Phase

Announce the next phase and why, then wait if the transition crosses a 🔒 gate:

| Finished | Next |
|----------|------|
| `discover` | `prd` — or straight to `project-plan` if trivial |
| `prd` 🔒 | `/gstack plan-ceo-review`, then `trd` if architecture changes, else `project-plan` |
| `trd` 🔒 | `/gstack plan-eng-review`, then `project-plan` |
| `project-plan` | Implement task by task — `qa` agent and one commit per task |
| `pr-review` 🔒 | PR, then merge 🔒 |
| merge | `retro` — which calls `memory-review` |

## Rules

- Always read the phase file; never improvise a phase from this table
- Never skip a phase because the work "seems small" — say so and let the user decide
- Never pass a 🔒 gate without explicit approval in the conversation
- One phase per invocation; chain by announcing the next, not by running it unasked
