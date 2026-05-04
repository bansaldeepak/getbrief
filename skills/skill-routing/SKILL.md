---
name: skill-routing
description: Maps workflow phases to custom vs gstack skills. Use when deciding which skill to invoke for a given phase (discovery, planning, QA, review, shipping, etc).
---

# Skill Routing — Custom vs gstack

gstack turns Claude Code into a virtual engineering team. Auto-upgrades enabled (`~/.gstack/config.yaml`). **Never use `mcp__claude-in-chrome__*` tools** — use `/gstack-browse` instead.

| Phase | Custom Skill | gstack Skill | How They Stack |
|-------|-------------|--------------|----------------|
| **Discovery** | `/discover` | `/gstack-office-hours` | Structured analysis vs provocative reframing |
| **Product** | `/product-manager`, `/prd` | `/gstack-plan-ceo-review` | Requirements first, then strategic scope review |
| **Architecture** | `/trd` | `/gstack-plan-eng-review` | Design doc, then stress-test it |
| **Planning** | `/project-plan` | `/gstack-autoplan` | Decompose tasks, then auto-review (CEO→design→eng) |
| **Design** | — | `/gstack-plan-design-review`, `/gstack-design-consultation`, `/gstack-design-shotgun` | Frontend work only |
| **Implementation** | `quality-check` agent | — | After each task |
| **Debugging** | `first-principles` | `/gstack-investigate` | Novel problems vs existing bugs |
| **QA** | `qa` agent (unit/lint) | `/gstack-qa` (browser) | Both — tests + UI clicks |
| **Code Review** | `/review` | `/gstack-review` | Checklist + human gate vs symbolic safety |
| **Security** | — | `/gstack-cso` | Before shipping auth/payments/user data |
| **Shipping** | manual `gh pr create` | `/gstack-ship` | Full automation: test→version→changelog→push→PR |
| **Deploy** | — | `/gstack-land-and-deploy`, `/gstack-canary` | Merge, deploy, monitor |
| **Performance** | — | `/gstack-benchmark` | Core Web Vitals baseline |
| **Retro** | `/retro` (qualitative) | `/gstack-retro` (quantitative) | Both — learnings + commit stats |
| **Safety** | `db-safety` (DB) | `/gstack-careful` (broad) | Both |
| **Memory** | auto-memory + `/memory-review` | `/gstack-learn` | Cross-session vs project-specific |

## Full Sprint Sequence (non-trivial features)

```
/discover → /gstack-office-hours (optional)
    → /product-manager → /prd (🔒) → /gstack-plan-ceo-review
    → /trd (🔒) → /gstack-plan-eng-review
    → /project-plan → /gstack-autoplan (optional)
    → implement → qa agent → /gstack-qa (if frontend)
    → /review (🔒) → /gstack-review → /gstack-cso (if sensitive)
    → /gstack-ship → /gstack-canary (if production)
    → /retro + /gstack-retro → /gstack-learn
```
