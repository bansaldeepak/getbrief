---
name: standards-split
description: Why standards are three skills, why stack content moved into repos, and what the 3,000-line-file problem actually was
type: project
created: 2026-07-29
updated: 2026-07-29
valid_until: permanent
importance: 4
---

Shipped 2026-07-29 (agents-setup#2, taiboli-app#149).

**The presenting problem** was 3,000-line files in real projects. The cause was not a rule being
ignored — it was that the only rule was one hedged bullet (`~200 lines`) in **last position** of
`coding-standards`, with nothing enforcing it, and **no frontend architecture guidance existed at
all** (a grep for `atomic design`, `composition`, `design system` across every skill returned
nothing). Backend had an enforced module shape and a scaffold skill; frontend had a folder name. So
backend stayed modular and frontend files ballooned.

**Decisions and why:**

- **Three standards skills, not two.** `coding-standards` (universal) + `backend-standards` +
  `frontend-standards`. Splitting into just backend/frontend would duplicate the universal half into
  both — the disease being cured.
- **Rejected atoms/molecules/organisms** for the component taxonomy. Classifying by size says
  nothing about who may import what; the ownership ladder classifies by dependency direction, which
  is the property that actually constrains change.
- **Stack-specific content belongs in the repo, not the machine.** The argument that settled it came
  from taiboli-app's own rules: the global stack skill claimed a dual vitest config, that repo has
  one, and the rule file carried a written caveat saying so. A global skill that is *wrong for the
  repo reading it* is worse than no skill. Project-local, it can simply be correct.
- **Per-commit and per-push approval became global** (`WORKFLOW.md` + `sdlc/implement`). This
  changes behaviour in every repo: silence is not approval, and approval to commit is not approval
  to push. Promoted from one project's `CODE-AGENT-INSTRUCTIONS.md`, which turned out to be the
  `implement` phase — the only box in the lifecycle graph with no skill behind it.

**Deliberately not done:** `observability.md` in taiboli-app (525 lines) should become a chaptered
project skill rather than a path-scoped rule; it is its own story.

Related: [[cross-reference-drift]], [[agent-config-loading]].
