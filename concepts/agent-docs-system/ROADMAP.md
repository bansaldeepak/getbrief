# Agent Documentation System — Roadmap

The single tracking document for this initiative. Every phase records **what**, **why**, **status**, and **what breaks if we stop here**.

## How to read this

Three sections, in order of what you'll want:

1. **Decisions log** — 30 entries. What was decided, why, and what it cost. Read this to avoid relitigating. Corrections to earlier decisions are marked inline rather than silently overwritten.
2. **Phases 0–12** — ordered by value per minute, not architectural tidiness. Phases 0–8 are done and had their first unattended live test in S-070 (PR #128). Each says what breaks if you stop there.
3. **Open questions** — question 1 (which spec generation is current) resolved 2026-07-20; it no longer blocks Phase 6, which is complete.

**Scope note:** Phases 0–10 are *this repo*. Phases 2.5 and 11 are *machine/global config*. Phase 12 is *process*. They're in one document because they share dependencies, but they ship independently.

**Everything asserted here was measured**, not assumed — file counts, token counts, commit dates, symlink states, schema collisions. Where something is inference rather than verification, it says so.

## Session summary — what produced this

A Phase-1 audit of 786 markdown files / 141,595 lines found 10 drift classes, the worst being three always-loaded files disagreeing about whether the app runs on Cloudflare Workers or AWS ECS six weeks after that decision was made. Investigation widened into agent tooling (skills, rules, plugins), global config (`~/.agents` vs `~/.claude` vs `~/.codex`), and workflow enforcement — because the same failure mode was present at every level: **two copies of a thing, no check, silent divergence.**

The system proposed here is one answer applied at three scales: a single source of truth, a generated projection of it, and a CI check that fails when they diverge.

- **Status legend:** ✅ done · 🟡 in progress · ⬜ pending · 🔵 blocked · ❌ dropped
- **Shipped:** Phases 0–3 in #121, Phases 4–5 in #124. Phase 6 is on `chore/agent-docs-phase-6`. Phase 2.5 is machine config in `~/.agents` — executed, uncommitted there, and outside this repo.

> **▶ RESUME HERE (updated 2026-07-21).** Phases 0–6 are done. Branch `chore/agent-docs-phase-6`, cut from `main` after #124 merged as `489c542`.
> - **Phases 0–3** shipped in #121; **4–5** in #124; **6** is on this branch.
> - **Pending user action (not in this repo):** commit `~/.agents` (Phase 2.5, executed but uncommitted there) and the gstack clean-slate reinstall — 6-step procedure in `memory/project_gstack_skills_management.md`.
> - **Next phase:** **Phase 9** — the `doc-sync` skill, the payoff. Phases 6–8 built the map, its validator, the drift check and the projections it needs.
> - **Flagged in passing:** a webhook test still mocks the deleted `courseChapter` / `studentCourseProgress` Prisma delegates (`app/server/modules/webhook/__tests__/webhook-service.test.ts`).

> **Sequencing constraint — ✅ RESOLVED 2026-07-20.** S-068 merged as `5186d70` (#120). This branch rebased onto it **cleanly, zero conflicts**. The docs-onto-code ordering worked as predicted.
>
> Two findings from that rebase:
>
> 1. **`documentation/product/` did not exist at the branch point.** S-068 created it independently — `documentation/product/session-start-pipeline.md` — while this proposal was separately arguing for the same directory. Convergent naming is decent evidence the structure is natural rather than imposed.
> 2. **The map caught its first live drift immediately.** S-068 deleted `app/shared/state/derive-object-state.ts`, folding the two conflicting mastery derivations into `app/server/services/tutor-engine/state-derivation.ts` — the split-brain recorded as TODO-020. A `covers_code` glob in `map.yaml.draft` pointed at the old path and is now corrected. This is exactly the failure mode Phase 7 automates: a doc silently describing a file that moved.

---

## Decisions log

Recorded so we do not relitigate. Each entry: decision, why, what we gave up.

### D1 — `AGENTS.md` is the single source of truth; `CLAUDE.md` imports it ✅

Claude Code reads `CLAUDE.md`, **not** `AGENTS.md`. The official pattern is a `CLAUDE.md` containing `@AGENTS.md`, which *expands the file into context at launch*. Our current `CLAUDE.md` says "Read and follow AGENTS.md" in **prose** — that relies on the model choosing to read it, not on the harness loading it.

**Gave up:** nothing. **Corrects:** my first draft, which had the same prose weakness.

### D2 — Stories are a frozen log, excluded from the doc system ✅

549 of 786 files are per-story PRD/TRD/task/summary. They are an append-only historical record, not current truth. They get no `verified_at`, no drift checks, no map node, and agents are told not to read them for how things work today.

**Gave up:** links from stories into moved/deleted docs now break. Accepted — broken links inside frozen history cost nothing.

### D3 — Delete superseded specs rather than archive ✅

`git rm` for `flow/v1…v6`. An `archive/` folder is still greppable and still looks authoritative to an agent that lands there from a search. Git history is a better archive precisely because it is *not* in the working tree.

**Gave up:** one-command browsing of old specs. Recovery is `git show 9b75569:<path>`.

### D4 — Two prompt copies are intentional, not drift ✅

`documentation/product/prompts/v8-modular/` is the **human-readable** source; `prisma/seed/data/prompt-templates/` is what **the system** seeds and runs. Both kept. Documented in `product/prompts/README.md`, including the one live divergence (`session-1-hindi.txt`, 12 lines) which is **under review, not resolved**.

**Reversed:** my earlier recommendation to delete the duplicates. That was wrong — I read filename collision as redundancy without asking why.

### D5 — Keep six guides as path-scoped **rules**, do not convert to skills ✅

Claude's own docs: rules load *"every session or when matching files are opened"*; skills load *"when Claude determines they're relevant."* Vercel's evals measured that determination failing — **skills never fired in 56% of relevant cases**.

The test: **knowledge needed *while* working → rule. Procedure run *at a moment* → skill.** All six guides are the first kind. The doc-updater is the second.

**Gave up:** nothing. Converting would trade a deterministic trigger for a coin flip.

### D6 — Symlink `.claude/rules/` → `documentation/guides/` ✅ IMPLEMENTED

> **Superseded in part by D24:** the directory is now `documentation/rules/`. The symlink mechanism below is unchanged; only the target path moved.

One real file per guide, in `documentation/guides/`, carrying `paths:` frontmatter. `.claude/rules/*.md` are symlinks to them. Cursor keeps its existing `.mdc` stubs.

**Why symlink here but not for `CLAUDE.md`/`AGENTS.md`:** a symlink cannot drift from its target. `CLAUDE.md` and `AGENTS.md` need genuinely *different* content (pointer vs source), so a symlink cannot express that relationship — hence import there, symlink here.

**Gave up:** a teammate who does not know the symlink exists may be surprised. Accepted; `guides/` README will say so.

### D7 — Anchor provenance on **story ID + PR number**, never commit SHA ✅

Measured on this repo: every commit on `main` carries a `(#NNN)` PR suffix — squash-merge is universal. A story's 34 task commits collapse into one squash SHA, so per-task SHAs do not survive. `Task:` trailers *do* survive the squash, but inconsistently (3 of the 8 most recent squashes have zero).

Therefore: **story ID** is the durable key (known even before a PR exists); **PR number** is backfilled at merge; **commit SHA is never recorded** in documentation.

**Corrects:** my earlier proposal to reference docs by commit id. **Credit:** raised by DB, verified against history before adopting.

### D8 — The "context graph" is a join over existing stores, not a new database ⬜

Research (Zep, Graphiti, kore.ai) describes bi-temporal graphs — *valid time* (when a fact was true) vs *transaction time* (when we recorded it). Those systems LLM-extract entities because their input is unstructured conversation.

**Ours is already structured.** Git is already bi-temporal: commit timestamp = transaction time, tree state = valid time, `git log -S` queries both. 645 `Task:` trailers already edge commits to stories. codegraph already holds 8,906 code nodes.

So the context graph = `map.yaml` (structure) + `log.md` (transaction time) + git (valid time + provenance), joined on **story ID**. No graph database.

Which yields a computable definition: **drift = transaction_time lagging valid_time**, i.e. `verified_at` older than the newest commit matching `covers_code`.

**Gave up:** semantic multi-hop querying. Not needed at 13 nodes. Revisit past ~40.

**Adopted from bi-temporal:** *mark invalid, don't delete* — when a doc claim becomes false, `log.md` records the supersession so "why did we change our mind" stays answerable.

### D20 — The API reference reads the live route tree, not a hand-maintained list ✅ IMPLEMENTED

`reference/api.md` is generated from `app/server/routes/index.ts` — the same Hono object the server mounts — so **a route cannot exist in the app and be missing from the docs**.

**Why this replaced the first implementation.** Phase 5 originally generated `api.md` from `openapi.json`, which `hono-docs.ts` builds from a hand-written list of every endpoint. That list is a second copy of what the code already knows, and nothing forces it to stay in sync. It had already failed twice, invisibly, because `docs:generate` was crashing and the spec was frozen:

- `chapters/routes.ts` was **in the list but deleted from code** → ENOENT
- `enrollment/customer-routes.ts` **exists in code but was never in the list** → 4 real endpoints absent from the spec, caught only by a test asserting on them

Reading the route tree found **77 endpoints where the config produced 39** — the hand-maintained list captured barely half the API surface.

**Two hard limits in `hono-docs.ts`**, found while trying to add the missing module and now recorded in `guides/api-routes.md`: `apiPrefix` names the intermediate output file, so two blocks sharing a prefix silently overwrite each other; and the tool emits every route found in `appTypePath` prefixed by `apiPrefix`, with `api: []` supplying only metadata. Together, a second module mounted under an existing prefix **cannot be expressed** — which is exactly enrollment's situation. `openapi.json` was therefore left as-is rather than regenerated into something worse.

**Gave up:** summaries still come from the central list, so 34 of 77 routes render as `_undocumented_`. That is deliberate — an undocumented route is now *visible* instead of absent. **Next step (not done):** move metadata next to the handler with `hono-openapi`, already a dependency. `guides/api-routes.md` is path-scoped to `**/*routes.ts` so this fires when someone touches a route.

### D9 — Generated beats written for schema and API reference ✅ IMPLEMENTED

`reference/schema.md` and `reference/api.md` become build artefacts. They replace ~3,200 hand-written lines that ran 4+ months behind weekly-changing code.

**Deliberately against** the Karpathy wiki model, where the LLM writes everything. For narrative docs that is right; for a schema reference an LLM paraphrase is strictly worse than reading `schema.prisma`.

### D11 — Skills are managed by the `skills` npm package, not a hand-rolled relinker ✅

**Already in use** — `~/.agents/.skill-lock.json` (v3, 33 skills) is this tool's lockfile.

| | |
|---|---|
| Package | `skills` by **vercel-labs** — same org as the AGENTS.md evals cited in Phase 2 |
| Latest | 1.5.19, published 2026-07-16 |
| Downloads | **9.16M/week**, 86 versions |
| Relevant flags | `-g/--global` vs project scope · `-a '*'` all agents · symlink by default (`--copy` opts out) · `update` / `list` / `remove` · `experimental_install` from lockfile |

**Supersedes:** my earlier recommendation to write `~/.agents/relink.sh`. That was hand-rolling a maintained tool — exactly what the original brief said to avoid.

**Explains the azure puzzle:** `lastSelectedAgents` lists 13 agents and **`claude` is not among them**. So azure skills went to `.codex/skills` (16) and `.agents/skills` (16) but never `.claude/skills` (0). "Disabled but still there" = they were never in Claude; you were seeing Codex's copy.

**Project-scope answers the token problem better than my per-host allowlist** — scoping follows the repo, not a list you maintain.

### D12 — Share `skills/` and `rules/` only. Never merge the config directories. ✅

> **Correction (2026-07-20).** An earlier version of this entry claimed `CLAUDE_CONFIG_DIR` does not exist. **It does.** I asserted that from a summarised doc fetch that returned "not documented" — twice — and did not verify. That is precisely the trap recorded in this repo's own `memory/feedback_grep_absence_not_proof.md`: absence of evidence in a source only counts if the evidence could have appeared there. The conclusion below is unchanged; the reasoning is replaced.

Both agents **can** relocate:

| Agent | Variable | Effect |
|---|---|---|
| Claude | **`CLAUDE_CONFIG_DIR`** | Overrides config dir (default `~/.claude`). Settings, session history and plugins move; macOS credentials stay in Keychain |
| Codex | **`CODEX_HOME`** | Root for config, auth, logs, sessions, skills |
| Codex | `CODEX_SQLITE_HOME`, `CODEX_INSTALL_DIR` | State and binary paths |

**But pointing both at one directory does not work.** Measured collisions between `~/.claude` and `~/.codex`:

| Path | Claude | Codex | Safe? |
|---|---|---|---|
| `skills/` | SKILL.md dirs | SKILL.md dirs | ✅ designed to be shared |
| `rules/` | 2 `.md` | same 2 + `default.rules` | ✅ already shared |
| `history.jsonl` | `{display, pastedContents, project, sessionId, timestamp}` | `{session_id, text, ts}` | ❌ **fatal** |
| `sessions/` | `13482.json` flat | `2026/` date-partitioned | ❌ |
| `plugins/` | 7 entries + git submodule | just `cache` | ❌ |
| `cache/` | `changelog.md` | `codex_apps_tools` | ❌ |

**`history.jsonl` alone settles it** — same filename, incompatible schemas, both appended every session. That is corruption, not inconvenience.

Note also that `~/.claude` is **itself a git repo** (`bansaldeepak/claude-config.git`, 164 tracked files, with a submodule). Merging trees would collide two `.git` directories and drag 270 MB of `projects/` transcripts into the setup repo.

**Decision: selective symlinks for `skills/` and `rules/` only.** Both env vars are isolation switches — using either to share 2 subdirectories would merge the 5 that must stay separate. Same conclusion as before, now for a verified reason.

### D16 — Three layers, one home each ✅

`~/.agents` is the **setup repo** — portable across machines, shareable, git-tracked.

| Layer | Contents | Scope |
|---|---|---|
| **`bansaldeepak/agent-skills`** (public) | your own skills | anyone, via `npx skills add` — you install yours the same way a stranger would |
| **`~/.agents`** (setup repo) | `WORKFLOW.md`, `providers/`, `build.sh`, `rules/`, and later the docs scaffolding scripts | you, across machines |
| **`~/.claude` / `~/.codex`** | sessions, history, plugins, projects, cache | machine-local, never shared |

**Rules stay in `~/.agents`** — they need the same distribution treatment as configs, and `build.sh` already lives there. Nothing in them is secret, but they are personal rather than publishable.

**Consequence:** once skills come from the published repo, `~/.agents/skills/` should stop being a second source of truth. `skills` already distributes to 13+ agents, so `.agents` never needs a skills story again — it becomes the *workflow* repo, and the 104-entry directory that drifted from `.claude` stops existing as a duplicate.

**Resolved — ONE repo. Your own skills live at `~/.agents/custom-skills/`.**

```
~/.agents/
  WORKFLOW.md providers/ build.sh rules/ setup.sh .skill-lock.json
  custom-skills/     ← your own skills. `npx skills add ./custom-skills -a '*' -g`
  skills/            ← npm/gstack-installed, tool-managed. Different provenance.
~/.claude ~/.codex   machine-local state
```

Since `skills add` accepts a local path and distributes to every agent, there is no need for a second repo, a submodule, or hand-managed symlinks. `custom-skills/` also avoids colliding with the existing tool-managed `skills/` — separation by provenance, which is what matters.

**Publish the whole setup later, if and when it earns it.** Not two repos from day one.

`.skill-lock.json` stays put — it records global installs and `.agents` is the setup repo.

**Verified 2026-07-20 against `skills@1.5.19` — three behaviours that change how you use it:**

| Finding | Consequence |
|---|---|
| **Local paths work.** `add ./custom-skills` → "Local path validated" | No repo needed to test |
| **Install COPIES, does not symlink.** Source edits do **not** propagate — confirmed with a fresh marker after install | Dev loop is **edit → re-run `skills add`**, not edit-and-go. One command, but it must not be forgotten |
| **Default scope is the project, not global.** Running in a directory created `./.claude/skills/` there | Global installs need explicit **`-g`** |
| **The agent id is `claude-code`, not `claude`** — `-a claude` errors with "Invalid agents" | This is why azure skills reached `.codex` but never `.claude` |

The copy semantics are the one real friction: an edited skill is silently stale in every agent until re-added. Worth a `make skills` or a `setup.sh` target so it is one habitual command rather than a thing to remember.

**Superseded:** an earlier version of this decision recommended a separate `~/dev/agent-skills` repo and rejected submodules. The separate-repo reasoning still holds *if* you ever publish, but it solves a problem you do not have yet. One repo now; split later only if publishing demands it.

**Why this ordering matters:** the docs scaffolding scripts (`map.yaml`, `log.md`, `documentation/` skeleton) only move into `~/.agents` **after Phase 9 proves the structure here**. Packaging an unproven structure into the setup repo exports a mistake to every future project.

### D17 — Your subagents exist and are used — except the one the workflow depends on 🟡

You asked whether the agents defined in global `CLAUDE.md` are ever used. All four exist at `~/.claude/agents/`. Measured across 153 session transcripts:

| Agent | Invocations | |
|---|---|---|
| `reviewer` | **21** | heavily used |
| `researcher` | **13** | heavily used |
| `general-purpose` | 8 | |
| `qa` | **1** | ⚠️ |
| `self-improving` | **1** | ⚠️ |

**This is D15's enforcement gap, measured rather than argued.** Global `CLAUDE.md` says *"After each task: `qa` agent → commit"*. Across every session on this machine, `qa` ran **once**. The rule is written, loaded into every session, and not followed — because prose is context, not enforcement.

`self-improving` is the same story: it is supposed to run after every retro.

Two readings, and they need different fixes:
1. The step genuinely gets skipped → an enforcement problem (D15, Phase 12)
2. The step is done manually via `npm run typecheck && lint && test` instead of the agent → the *rule* is wrong, not the behaviour, and should be reworded to match what actually works

**Do not build enforcement before deciding which.** Enforcing a step that people rationally skip just produces a bypassed check. Worth reading a few of the 21 `reviewer` invocations to see what happened instead of `qa`.

### D13 — Publish your own skills as a public repo: low risk, one thing to strip ⬜

Scanned all 16 of your own skills plus the wider tree:

- **Zero** secrets-shaped strings (`sk-`, `phc_`, `rzp_`, `pk_test`)
- **Zero** company/client identifiers in your 16 skills
- **One leak:** `~/.agents/skills/project-retro/SKILL.md:103` embeds `~/.claude/projects/-Users-db-Work-Arcitae-astro-astro-app` — reveals your username and the `Arcitae` org name. Strip before publishing.
- The `Panya` hits in `gstack/browse/test/fixtures/` are **"Panyaden International School"**, an unrelated Thai school in a gstack test fixture. Coincidence, not leakage.

**Do publish a curated repo of your own 16 skills. Do NOT publish `~/.agents` wholesale** — it contains 552 scripts and a full vendored copy of gstack, i.e. republishing someone else's project under your name.

**Real risks, stated plainly:**
1. **You become a dependency.** Others installing from your repo means breaking changes affect them.
2. **Typosquatting.** Once `db/agent-skills` is a known install target, a near-miss repo name is an attack surface — for *you*, since you'll be typing the install command.
3. **Skills can carry executables.** Your 16 have none today. Publishing normalises installing-by-URL; keep them script-free or the supply-chain surface grows.

Nothing here is secret, so the harm is operational, not confidentiality.

### D14 — Rules: `@intellectronica/ruler` exists, but do not adopt it yet ✅ IMPLEMENTED

| | |
|---|---|
| Package | `@intellectronica/ruler` — *"apply the same rules to all coding agents"* |
| Latest | 0.3.44, published 2026-06-30, 70 versions |
| Downloads | **50k/week** — real, but 180× smaller than `skills` |
| Covers | Claude Code, Codex, Cursor, Copilot, Gemini CLI, Windsurf, Zed, Amp, Roo, Junie and more |

**Decision: do not adopt. Extend `build.sh` instead.** Your `build.sh` already generates provider configs correctly (verified: `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md` both match its output). The gap is only **rules distribution** — 5 rules in `~/.agents/rules`, 2 reach `.claude`, 3 reach `.codex`.

Adopting a second tool with its own config format to close that gap increases blast radius for no gain. **Revisit if rules exceed ~15 files or an agent needs a format `build.sh` cannot emit.**

**Borrow the concepts, not the dependency.** Three things `skills` does that the rules installer should copy:

| Concept | Why |
|---|---|
| **Explicit agent list, correct ids** | `claude-code` not `claude` — the naming trap already cost you (D16). Keep one canonical list in `~/.agents`, used by both `build.sh` and skill installs |
| **`-a '*'` meaning all agents** | Your stated primary requirement. Default to all; per-agent selection is the exception |
| **A lockfile / manifest of what was installed where** | Without it you cannot detect the drift you already have. This is the same check as `docs:drift`, one level up |

**Deliberately NOT borrowed: copy-on-install.** `skills` copies, which is why edited skills go stale (D16). Rules should **symlink** — `ln -sfn ~/.agents/rules ~/.<agent>/rules` — so an edited rule is live everywhere immediately. Rules are small, hand-written and edited often; skills are packages fetched from elsewhere. Different artefacts, different mechanics.

Scope: ~15 lines in `build.sh`, one canonical agent list, one symlink per agent. Sequenced as Phase 2.5 step 6.

**Implemented 2026-07-21 (uncommitted in `~/.agents`).** One refinement vs the sketch above: rules are symlinked **per-file**, not as a whole-directory symlink. A dir symlink over `~/.codex/rules` would bury `default.rules` (Codex's command allowlist); per-file linking keeps each agent's own policy files intact. `check.sh` (Phase 2.5 step 7) verifies the result two-way and exits non-zero on any drift — the manifest/drift-detection concept from the table above, realised as a read-only guard rather than a lockfile.

### D15 — 100% workflow enforcement is not achievable via instructions. Only hooks and CI enforce. 🟡

Claude's own documentation is unambiguous:

> "Claude treats them as context, **not enforced configuration**. To block an action regardless of what Claude decides, use a **PreToolUse hook** instead."

Your lifecycle (`discover → prd → trd → project-plan → implement → review → merge → retro`) lives in global `CLAUDE.md` as prose. That is **context**, which is why it needs re-enforcing. No amount of rewording makes prose deterministic.

Three enforcement tiers, and only the third is genuinely cross-agent:

| Tier | Mechanism | Coverage | Strength |
|---|---|---|---|
| Prose | `CLAUDE.md` / `AGENTS.md` | all agents | advisory — what you have now |
| Hooks | `PreToolUse` | **Claude only**; Codex has its own, Cursor has no equivalent | blocking, per-agent |
| **CI** | GitHub Actions | **every agent, and humans** | blocking, universal |

**So enforce at the artifact, not the agent.** A CI check that fails when a PR touches `app/` with no `documentation/stories/<f>/S-NNN/` and no `PROJECT-TRACKER.md` row enforces the story-first rule regardless of which agent (or person) wrote the code. That is the only place "100%" is achievable.

**Blast-radius warning:** a `PreToolUse` hook that blocks `Write`/`Edit` blocks *everything* when it misfires, mid-task, with no obvious cause. If adopted: **advisory (warn) first for at least a week, blocking only after**. This is the single highest-risk item in the whole roadmap and is deliberately sequenced last.

### D18 — Memory is short-term. On story completion it graduates, then shrinks. ⬜

**Memory is working state between sessions and agents, not an archive.** Without a graduation step it becomes a second documentation system that the doc map does not point at — so knowledge is technically retained and practically unfindable.

**Proof it is already happening:** `guides/observability.md` is 509 lines and mentions **pino zero times**. DEC-002 adopted pino on 2026-07-15 and the implementation notes live in `memory/project_pino_logging.md`. The guide Tier 1 routes every logging question to does not know the logging library changed.

**Four destinations at story completion:**

| Content | Goes to | Why |
|---|---|---|
| How it works now | `documentation/` (architecture, guides, reference) | it is current truth; belongs where the doc map points |
| Why we chose this | `documentation/decisions/` | rationale outlives the implementation |
| **What surprised us / the trap** | **stays in `memory/`** | the only genuinely durable memory content |
| Status, branch, PR, progress | **deleted** | derivable from git (D7); a status line is a future lie with a timer |

**The naming convention already encodes this split** — it was just never enforced:

```
project_*    29 files  1,115 lines  (80%)  → graduate
feedback_*    7 files    266 lines  (20%)  → keep
```

Oldest `project_*` files date to 2026-05-08 and describe v6 work that shipped long ago. Nothing has ever left `memory/`.

**Graduation trigger = story completion = the same trigger as `doc-sync` (Phase 9).** One pass does both: update the docs, then prune what graduated. Splitting them into two habits means the second one does not happen.

**Consequence:** memory growth becomes bounded — roughly 20% of what enters stays. Today 100% stays.

### D19 — Project status is derived from git, never hand-written ⬜

**The premise that `PROJECT-TRACKER.md` is more live than `MEMORY.md` is false.** Measured 2026-07-20:

```
tracker says  S-066 in-progress   →  merged #118
tracker says  S-068 in-progress   →  merged #120
branches named: feature/mastery-materialization, feature/language-layer-v2,
                feature/webrtc-playground  — all three DELETED
```

Both files are stale in the same way, so moving status from one to the other relocates the rot rather than fixing it.

**Status is derivable.** Every squash on `main` carries the story ID and `(#NNN)`:

```
S-066 -> #118    S-067 -> #118    S-068 -> #120     (one `git log --grep`)
```

So:

| File | Holds | Status column |
|---|---|---|
| `memory/` | learnings only — no PR numbers, no branch names | none |
| `PROJECT-TRACKER.md` | what git cannot know: why the story exists, scope, decisions, what is deliberately out | **generated** |
| git | the status itself | — |

This is D9 ("generated beats written") applied to project state instead of schema docs.

**Correction:** the MEMORY.md rewritten in Phase 3 initially carried PR numbers in its Shipped section — reintroducing exactly the decay it was removing. Stripped.

### D10 — Contradiction detection is unsolved and stays out of the PR gate ⬜

The drift check catches *stale* (dates) and *broken* (paths). It does **not** catch *contradictory*. **D1 of the audit — three files disagreeing about whether this app runs on Cloudflare or ECS — would pass it green.** Every path valid, every date fresh.

Contradiction needs an LLM pass over the mapped set. Too slow and too non-deterministic to block a merge → weekly report only.

**This is the known weakest link in the design.** Recorded so it is not mistaken for covered.

### D21 — Domain concepts are nodes. This is how D8's join actually gets built. ⬜

D8 settled *no graph database*. It did not say what the join is joined **on**. Story ID edges commits to stories; it does not edge `Session` to the tables, code and docs that describe it. So the graph is real but has only one node type — the document — and a doc-to-doc graph is a **citation graph**: its edges mean "this file mentions that file". At 786 files that renders as a hairball whose hubs are just heavily-linked index pages. It cannot answer a question.

**Three entity graphs already exist here, mutually unlinked:**

| Store | Nodes | Edges | Has docs? |
|---|---|---|---|
| `prisma/schema.prisma` | 43 models | foreign keys | no |
| `.codegraph/codegraph.db` (17 MB, MCP-queryable) | 8,906 symbols | calls | no |
| `documentation/map.yaml` | 19 docs | `links`, `covers_code` | **only this one** |

The gap is that **no node type spans them**. A `concept` node is that node type:

```yaml
- id: session
  kind: concept
  models: [Session, SessionPlan, SessionEvent]   # → schema.md anchors, verified against Prisma
  code: ["app/server/modules/session/**"]        # → codegraph symbols
  docs: [session, session-start, prompts]        # → existing map nodes
  related: [tutor, avatar, user]
```

**Half of this is already written.** `MODEL_GROUPS` in `scripts/docs/generate-schema-doc.ts` assigns all 43 models to 8 domains — Identity & Consent, Courses & Billing, Teaching & Sessions, Session Intelligence, Syllabus & Mastery, Games, Assessment, Engagement & Infrastructure. Those *are* the concept nodes; today they only split the ERD. Promoting them costs a field, not a rewrite.

**What this buys that the citation graph cannot:** *which docs describe `Avatar`?* · *this concept has models and code but no doc* (the game/engagement gap, currently a YAML comment) · *you changed `Session`, here are the 3 docs covering it*. The last one is Phase 9's entire job.

**Still no database, for the same reason as D8** — ~50 nodes is a YAML file; the value is the *projections*, which are static text; and a `.db` blob cannot be reviewed in a PR diff, where a wrong edge gets caught. D8's "revisit past ~40 nodes" refers to **doc** nodes; concept nodes are a second axis and do not count against the 25-node ceiling. Transitive impact across hundreds of symbols stays codegraph's job.

**Gave up:** concept↔model edges are only as true as `MODEL_GROUPS`. Mitigated by validating `models:` against the parsed Prisma schema in `docs:map:check` — an unknown or unassigned model fails the build.

### D22 — One memory store, in the repo. Today there are two, and the wrong one loads. ✅ IMPLEMENTED (2026-07-22)

Global `CLAUDE.md` states: *"NEVER write memory to `~/.claude/projects/*/memory/`. Project repo `MEMORY.md` + `memory/` only."* Measured 2026-07-22:

| Store | Files | Loaded every message? | Sanctioned? |
|---|---|---|---|
| `memory/` + `MEMORY.md` (git-tracked) | 39 | **no — never** | yes |
| `~/.claude/projects/…/memory/` | 24 | **yes — 1.4k tokens** | **no** |
| overlap by filename | 2 | | |

The stores are **disjoint**: 22 provider-only files, 37 repo-only. Several provider entries were already promoted to global rules and now exist in three places (`pattern_clerk_user_resolution`, `feedback_css_ternary_pattern`). The loaded index is also stale — it still reads "Paused at Phase 5, 16 decisions" while the repo index is current and carries the D18 graduation policy.

**This is the duplication the file count was signalling.** Not judgment drift — two systems, one of them invisible to git, review and every non-Claude agent.

**Resolution:** repo is canonical. Merge provider-only entries in, delete the provider store, leave a pointer. Loading the repo `MEMORY.md` instead is a wash on tokens (5.3 KB vs 1.4k) and makes the index reviewable, diffable and shared.

**Gave up:** cross-project memory. Nothing in those 24 files is cross-project; anything that becomes so belongs in `~/.agents/rules/`, which is already the mechanism.

**Executed 2026-07-22, verified 2026-07-28.** The provider store now holds a single `MEMORY.md` pointer explaining the retirement and naming the repo index as canonical; the repo store carries **67** entries. Of the 24 provider files, 18 were copied across, 4 dropped as already promoted to `~/.agents/rules/` (`clerk-auth-refs`, `css-ternary-classname`, `prisma-migration-workflow`, `clerk-user-resolution`) and 2 reconciled by hand. The stale "Paused at Phase 5, 16 decisions" index line is gone. **One loose end:** the 24 originals remain at `~/.claude/projects/…/memory-archived-2026-07-22/`, kept deliberately until a human confirms nothing was lost — delete that directory to close this out.

### D23 — Duplication is detected mechanically, not remembered ⬜

Two docs describing the same thing is the failure the file count implies, and no human notices it at 786 files. It is cheap to detect: nodes whose `covers_code` globs resolve to overlapping file sets, or that share `triggers`, are candidate duplicates. Add `docs:overlap` to the drift script and report — **warn, never fail**, because legitimate overlap exists (`coding-standards` covers `app/**` and `frontend` covers `app/client/**`; the parent/child relation is intended). Failing on it would train people to widen globs until the check shuts up.

### D24 — `documentation/guides/` is renamed to `documentation/rules/` ✅ IMPLEMENTED

D5 decided these are **rules**, not guides. D6 symlinks them into `.claude/rules/`. Every consumer already called them rules; only the directory said otherwise, and that mismatch was a translation step on every read.

Blast radius was 7 symlinks, 1 index, `map.yaml` paths, the AGENTS.md projection, and prose cross-references — all mechanical, all covered by `docs:map:check` and the CI regenerate-and-diff, so a missed reference fails the build rather than rotting.

**Two things the rename taught, both worth keeping:**

1. **A blind `s/guides/rules/` is wrong.** Most `guides/` matches in this repo are *external URLs* — `docs.sentry.io/…/guides/react-router/`, `clerk.com/docs/guides/…`. Only the anchored forms (`documentation/guides/`, `../guides/`, `./guides/`) are internal. Rewriting the bare token would have corrupted a dozen reference links.
2. **Frozen records must be excluded from mechanical rewrites.** The first pass rewrote `PROPOSAL.md`, the two `.draft` files and D6 itself, turning D24's own heading into "`rules/` is renamed to `rules/`". Those were restored and D6 carries an inline supersession note instead — per this document's own rule that corrections are marked, never silently overwritten. **Generated and current docs get rewritten; history gets a pointer.**

**Gave up:** "rule" now means two things — a repo doc and a `~/.agents/rules/` entry. Accepted: they are the same *kind* of thing at different scopes, which is the point.

### D25 — The always-loaded set is a budget, and global `CLAUDE.md` is the largest line in it ✅ IMPLEMENTED

Everything the tier system controls is dwarfed by what loads before any of it. Measured this session:

| Always loaded | Tokens |
|---|---|
| global `CLAUDE.md` (149 lines, 13 sections) | **2.6k** |
| project `AGENTS.md` + `CODE-AGENT-INSTRUCTIONS.md` | 1.6k |
| unscoped `~/.agents/rules/` (5 files) | 2.2k |
| memory index | 1.4k |
| skill + agent descriptions | 5.9k |

Three claims are stated in **all three** always-loaded prose files — never commit to `main`, no repo-wide `eslint --fix`, no repo-wide `prettier --write`. The 4-row agent table in global `CLAUDE.md` restates the frontmatter of `~/.claude/agents/*.md`, which loads separately (566 tokens).

**Split by scope, one home each** (D16's principle, applied to prose rather than files): global keeps what is true on every machine and every project — lifecycle, story/task IDs, commit convention, plan mode, critical thinking. Project-specific enforcement — branch policy, commit gates, tool bans — lives in `AGENTS.md`/`CODE-AGENT-INSTRUCTIONS.md`, which are the layer that can actually be enforced by CI. Delete from global anything the project layer already states.

**Sequenced after the project layer is settled** (Phase 11) — deduping upward before the lower layer is final would just move text twice. Global `CLAUDE.md` is built from `~/.agents/WORKFLOW.md` + `providers/`, so this is a `~/.agents` edit, not a `~/.claude` one.

**Caveat, and the reason this is a measurement first:** D17 already showed prose does not enforce — `qa` ran once across 153 sessions despite being mandated in global `CLAUDE.md`. Compression must not be assumed to be free of behaviour change. Cut duplication first, since a claim stated three times is not three times as enforced.

**Implemented (Phase 11c).** Edited `~/.agents/WORKFLOW.md` + `providers/claude.md` at source (never the generated file); `build.sh` regenerated all three provider configs, `check.sh` verified byte-equality. Deleted the Claude-only agent table (restated always-injected agent frontmatter); compressed the Lifecycle scenario table, branch-safety block, and Memory-Checkpoints table to prose — **no rule removed, only de-duplicated and tightened**, since a rule that is a floor for greenfield projects must survive. Measured with tiktoken `cl100k_base`: 1671 → 1453 tokens (−13%); scaled to Claude's own tokenizer (D25 baseline 2.6k) ≈ −340 tokens off the always-loaded set. The `main`/`eslint`/`prettier` claims were *compressed*, not deleted — deleting the global floor to dedup a repo that happens to restate it was rejected, since `WORKFLOW.md` is the floor for every project including those with no `AGENTS.md`.

### D26 — One matcher. Two engines answering the same question is how a green check lies. ✅ IMPLEMENTED

**The drift check had been partly false since Phase 7 shipped, and reported green the whole time.**

`docs:map:check` validated `covers_code` globs with **minimatch**. `docs-drift.ts` checked staleness by passing the same globs to **`git log -- <glob>`** as a pathspec. Git pathspec does not do brace expansion:

```
app/**/*.{ts,tsx}   → git returns []            ← matched nothing
app/**/*.ts         → git returns 2026-07-22
```

So one component certified a glob as valid while the other silently matched zero files. Five globs across three nodes were dead:

| node | dead glob | impact |
|---|---|---|
| `coding-standards` | `app/**/*.{ts,tsx}`, `server/**/*.ts` | covers all of `app/**` — **never fired once** |
| `testing` | `**/*.test.{ts,tsx}` | partly covered by `**/__tests__/**`, which worked |
| `observability` | two `{a,b,c}.ts` brace forms | no commits in range; latent |

Replayed against the 10 commits since the map shipped: `coding-standards` should have fired on **3**, `testing` on **4**. Both reported clean. This is why S-070 could leave `coding-standards` unbumped with CI green.

**Fix:** one engine — minimatch — everywhere. Globs resolve in-process; git is called only for commit dates and `ls-files`, never with a glob. Plus check **3b**: every glob must match ≥1 tracked file *through the engine the drift check itself uses*, so the two can never silently diverge again.

**`minimatch` was also not a declared dependency.** `check-map.ts` imported it and got it via a six-level transitive chain (`@posthog/ai → @google/genai → google-auth-library → gaxios → rimraf → glob`). One PostHog bump and doc validation dies at CI with module-not-found. Now a direct devDependency.

**The general lesson, which outranks the specific bug:** a check that matches nothing reports nothing and is indistinguishable from a check that passes. Every filter needs a **negative test proving it can fail** — both new checks here have one.

**Gave up:** nothing. **Cost:** `coding-standards` covers `app/**` and now reports stale on nearly every story. Correct, but close to crying wolf; narrowing it is a scope decision, recorded in `log.md` under Known gaps rather than taken silently.

### D27 — `doc-sync` never bumps `verified_at` on its own ✅ IMPLEMENTED

`verified_at` is defined in `map.yaml` as *the date a **human** last confirmed this doc is true — not the git mtime; a reformat is not verification.* A tool that sets it as a side effect of running converts every check downstream into a rubber stamp: the date advances, drift goes quiet, and nothing was read.

So `docs:sync` splits the work by who can actually do it:

| Deterministic — the tool does it | Judgment — the human does it |
|---|---|
| match changed files → nodes | decide whether the prose is still true |
| re-run `generated:` commands | write the correction |
| print the `log.md` line | supply the note explaining *why* |
| bump `verified_at` for nodes named in `--verify` | choose which nodes to name |

The tool will happily tell you all six docs your change touched. It will not claim you read them.

**Same reasoning excludes prose rewriting.** That is Phase 9b, and it needs section markers that do not exist — see the note under Phase 9b.

**Gave up:** a one-command "sync everything". Deliberately: the friction *is* the verification step. If bumping five nodes feels tedious, the honest fix is narrowing `covers_code`, not automating the confirmation away.

### D28 — `covers_code` is a subset of `paths:`, not equal to it ✅ IMPLEMENTED

A rule file carries two scopes, and D6 conflated them by requiring `covers_code` to **equal** the rule's own `paths:` frontmatter:

| field | question | correct shape |
|---|---|---|
| `paths:` | when should this rule be **loaded**? | broad — "you are editing TypeScript, here are our conventions" |
| `covers_code` | what change could make it **false**? | narrow — only what the doc actually claims |

Forcing equality drags the staleness scope out to the loading scope. `coding-standards` documents route-file naming, the `/me` and `/api/admin` prefixes, and the sub-module pattern — but claimed all of `app/**`, `scripts/**` and `server/**`. Measured over 121 commits:

| `covers_code` | fires on |
|---|---|
| `app/**/*.{ts,tsx}` + `scripts/**` + `server/**` | **76 / 121 — 63%** |
| `app/server/modules/**` | 50 — 41% |
| `**/*routes.ts` + `**/index.ts` — what the doc describes | **30 — 25%** |

**Crying wolf was the smaller problem.** The larger one: a claim of coverage silences the map-hole detector underneath it. Replaying S-070 —

```
map holes reported with the broad glob   : 0
map holes reported with a precise glob   : 4   (session-resolution.ts, types.ts,
                                                avatar-debug-utils.ts, env.ts)
```

Four genuinely undocumented files sat inside a glob asserting they were covered. **An over-broad `covers_code` is a false claim of documentation coverage, not merely a noisy one.**

That is the third instance this session of one failure shape — *a check that cannot fail looks exactly like a check that passes*: a dead glob (D26), `prettier --check` silently skipping ignored files, and now a hole detector satisfied by a glob that claims everything.

**Fix:** the invariant becomes **subset** — anything that can falsify a doc must be within the doc's scope, but not everything in scope can falsify it. Compared as *resolved file sets*, not glob strings: glob subset is not decidable textually, and `app/server/modules/**/*routes.ts` vs `app/**/*.{ts,tsx}` is precisely that case.

**Gave up:** the single-field simplicity of D6. Two fields is genuinely more to keep straight, and a reader must now be told why they differ — hence the comment block in `map.yaml`. Worth it: the alternative is a check nobody trusts and a hole detector that never reports.

**Applies to one node today.** `testing` (`**/__tests__/**`), `observability` (named files) and `frontend` (`app/client/**` for a doc about UI style) are all defensible as equal.

**What it exposed.** With the over-claim removed, **123 TypeScript source files have no owning node** — `app/server/` 38, `app/client/` 26, `app/shared/` 17, `scripts/` 16, `server/` 8. That number was always true; the broad glob simply asserted otherwise. It is recorded in `log.md` and deliberately not "fixed": closing it by widening some other `covers_code` would recreate exactly the false coverage this decision removed.

### D29 — Workflow commands become skills; commands stay for what only a human types ✅ IMPLEMENTED (11e) — with one correction

`~/.claude/commands/*.md` (`/prd`, `/trd`, `/discover`, `/review`, `/retro`, `/decision-doc`, `/memory-review`) and `SKILL.md` files answer the same call — both are `user_invocable`, both fire as `/name` — but differ in two ways that matter here:

| | command | skill |
|---|---|---|
| trigger | **only** a typed `/name` | typed `/name` **or** model auto-invokes by description |
| distribution | `~/.claude/commands/` — **Claude-only**; `build.sh` does not ship it | `skills add` copies to every agent, incl. `~/.codex/skills/` |

Measured: 96 skill/command invocations across 64 sessions; the workflow verbs (`prd` 10, `review` 6, `discover` 5, `trd` 4) are the busiest surface, and all are Claude-only commands today. Converting them to `user_invocable` skills in `custom-skills/` (D16) yields three things at once — auto-trigger by flow, cross-agent availability (the Codex gap), one source of truth — **without losing `/prd`**, which still types verbatim.

**Risk (D17):** a skill's auto-trigger is not more reliable than a typed command; a converted step could be *skipped* where a human would have typed it. Mitigation: keep every converted skill `user_invocable` so the typed path is unchanged and auto-trigger is a bonus; convert one (`/decision-doc`) first and watch it before the rest. **Commands are not abolished** — they remain the right tool for a deliberate, human-only macro that should *never* fire on its own.

**Correction from implementation (2026-07-28).** The table above is missing a row that decides one of the seven: **a command shadows a same-named Claude Code built-in; a skill does not.** `/review` is a built-in ("Review a GitHub pull request"), so retiring `review.md` did not move the verb to our skill — it surrendered the verb to the built-in and made our skill unreachable. It ships as `pr-review`. Before retiring any command, check whether its name collides with a built-in; if it does, the typed verb *cannot* be preserved and the skill needs a distinct name. Six of seven were unaffected.

### D30 — Tech-stack rules are a repo concern; the global rule set stays tiny and generic ✅ IMPLEMENTED (11d rules, 11f skills)

Four of the five global `~/.agents/rules/` are tech-stack-specific — `clerk-auth-refs`, `clerk-user-resolution` (Clerk+Prisma), `prisma-migration-workflow` (Prisma), `css-ternary-classname` (this repo's Prettier). They carry `globs:` frontmatter yet load into **every** project unconditionally (verified: all five appear in a session's system prompt regardless of globs), taxing ~1.8k always-loaded tokens on machines and repos that have no Clerk or Prisma. Only `codegraph` is genuinely tool-generic.

**Decision:** demote the four to the repo's path-scoped `documentation/rules/` — where they fire only on matching files — and keep global rules to what is true on every project. Coverage before deletion (measured): `clerk-user-resolution` and `prisma-migration-workflow` are already in repo `AGENTS.md`; `clerk-auth-refs` and `css-ternary-classname` had **no** repo home, so both were added to `documentation/rules/frontend-components.md` (scoped `app/client/**`, tighter than `coding-standards`' `app/**`) **before** any global deletion — the repo add lands first so nothing is lost in the window.

**Corrected in flight — the merge premise failed verification.** The initial ask included "merge the backend repo rules (`api-routes` + `best-practices` + `coding-standards`) into one." Reading them showed the opposite: they are already thin and *deliberately layered* — each opens with "see the global `hono-react-router-prisma-stack` skill … this file contains **only** Panya-specific practices," and each is cleanly path-scoped. Merging would broaden every scope (route-doc guidance firing on all `.tsx`) and collapse the generic-skill ← thin-repo-rule split. **No merge.** Likewise, the three "duplicate" skills (`coding-standards`, `hono-react-router-prisma-stack`, `product-analytics`) are the delegation targets those rules name — cutting them would orphan the references, so they are **kept**. Skill pruning narrows to the unused *and* unreferenced (`knowledge-organization`, `skill-routing`, `product-manager`, `quality-check`) plus the irrelevant `rust-analyzer-lsp` plugin. A spec that dissolves on contact with the files is a finding, not a task.

---

## Phase 0 — Audit ✅ COMPLETE

Findings in `PROPOSAL.md` §1, external verification in `TOOLING-AUDIT.md`.

Headline: 786 docs / 141,595 lines; 49% untouched in 6+ weeks; 10 drift findings including three files disagreeing about the deployment runtime.

---

## Phase 1 — Delete dead weight ✅ COMPLETE (committed `eb33548`)

**77 files, 37,578 lines.**

| Group | Files | Authorised by |
|---|---|---|
| `flow/v1…v6` + 5 inter-version diffs | 53 | "flow can keep only latest copy, rest from git" |
| Dated session-1 prompt snapshots | 15 | "delete, keep one latest copy of each" |
| `docs/superpowers/` | 2 | "I have uninstalled superpowers" |
| `audit/` → merged into `audits/` | 7 renamed | "aligned on duplicate audit folders" |

**Pending your validation:** the full file list was published for review; `flow/v6/13_Privacy_Policy.md`, `14`, `15` are COPPA/SOPIPA texts worth a diff against their v7 counterparts before final sign-off.

**Stop here and:** the pile is 12% smaller and grep returns one answer for "universal core" instead of six.

---

## Phase 2 — Reorganise ✅ COMPLETE (committed `dd4851d`)

| From | To | Count |
|---|---|---|
| `flow/v7/` | `product/spec/v7/` | 21 |
| `prompts/` | `product/prompts/` | 14 |
| `flow/deepseek-game/` | `product/engagement/games/world-builder/` | 2 |
| `resources/` | `product/source/` | 2 |
| `rules/project-context.md` | `product/context.md` | 1 |
| `rules/` | **`guides/`** | 6 |
| `proposals/agent-docs-system/` | `concepts/agent-docs-system/` | 9 |

Also: deleted `rules/tech-stack.md`, `rules/mvp-requirements.md`, `pnpm-lock.yaml`; added `"packageManager": "npm@11.12.1"`; fixed `observability.md:3` (Cloudflare → Node/ECS) and `frontend-components.md:3` (age 8–14 → 6–12); fixed the dead `analytics` skill reference → `product-analytics` and stripped all seven `~/.claude/...` link targets per the repo-local-references rule; renumbered six colliding TODO ids and closed three verified-done items; repointed 4 Cursor stubs and deleted 2 whose targets no longer exist.

**Two items flagged for your judgment:**
1. The **age edit** (8–14 → 6–12) is inference, not a verified product fact. Revert if 8–14 was deliberate.
2. `product/spec/v7/` **keeps the `v7` folder**. Flattening reads truer but breaks every inbound `flow/v7/...` path in stories.

**Stop here and:** the tree matches the tiers, Cursor stops always-loading a pre-v6 MVP scope doc, and nothing points at a deleted file.

---

## Phase 2.5 — Fix the global agent setup ✅ COMPLETE — committed and pushed in `~/.agents` (2026-07-28)

Machine config, not this repo. Phase 4 symlinks `.claude/rules/` and would otherwise inherit a broken foundation. Executed 2026-07-21; the `~/.agents` changes sat uncommitted for a week and were **committed and pushed 2026-07-28** (`e4db0eb` and neighbours), which is what closes this phase.

**Rules are now closed-loop:** one source (`~/.agents/rules/`) → `build.sh` distributes per-file to `~/.claude/rules` and `~/.codex/rules` → `check.sh` verifies → `setup.sh` runs both. The three rules that previously reached no agent (`prisma-migration-workflow.md`, `clerk-auth-refs.md`, `css-ternary-classname.md` — all flagged critical in `MEMORY.md`) reached both agents under this mechanism.

**Superseded in part by 11d:** those same three rules have since been *demoted to the repo* per D30, because they are tech-stack-specific and were taxing every project. `~/.agents/rules/` now holds `codegraph.md` alone. The closed loop described above is unchanged — only its payload shrank from 5 rules to 1.

**Skills are deliberately NOT centralised** — the finding that resolves step 4/5. The three provider skill dirs are different populations, not drifted copies of one source:
- `.gemini/skills` extras (`alloydb-*`, `bigquery`, `cloud-sql-*`, `spanner-*`) are Google's own bundled skills.
- `.codex/skills` has `codex-primary-runtime`; `.claude/skills` has the `gstack-ios-*` set.
- The only *content* diffs (9, all in `.claude`) are `gstack-*` skills — third-party, generated by gstack's own build from a 1036-SKILL.md monorepo. **None are the user's own skills.** Resolution is gstack's `gstack-upgrade`, not hand-reconciliation. Blanket-symlinking `.gemini` to `~/.agents/skills` would *delete* Google's native skills.
- Conclusion: **rules are shared across providers; skills are legitimately per-provider.** Skills stay independent real dirs.

**Steps:**

| # | Step | State |
|---|---|---|
| 1 | Commit `~/.agents` — 8 weeks of uncommitted work is the standing exposure | ⬜ user reviewing |
| 2 | `npx skills list` — real per-agent picture | ✅ done |
| 3 | Remove `azure-*` skills globally (agent dirs + `~/.agents/skills` source, 106→85) | ✅ staged (321 `D`) |
| 4 | Reconcile diverged skills | ✅ resolved — no manual work; see above |
| 5 | `claude-code` vs `claude` agent-id / skills agent set | ⬜ open (`claude-code` is the id; verify the agent set) |
| 6 | Extend `build.sh` to distribute rules per-file (D14) | ✅ done |
| 7 | Sync check (`check.sh`) — configs **and** rules, two-way, exits non-zero on drift; wire into `setup.sh` | ✅ done |
| 8 | `setup.sh`: drop the dir-symlink footgun (would bury `~/.codex/rules/default.rules`), add `check.sh` gate | ✅ done |
| 9 | Untrack the phantom `skills/gstack` gitlink so `~/.agents` stops showing ` m` on every gstack self-update | ✅ done (`git rm --cached`, files kept) |
| — | Correct `~/.agents/README.md` (documents symlinks that only partly exist) | ⬜ open |

**Do not** blanket-symlink `~/.claude/skills → ~/.agents/skills`. That pushes all skills — including `azure-*` — into every message, and would clobber provider-native skills (D11).

**Remaining before this phase closes:** commit `~/.agents` (step 1), settle the `claude-code` agent set (step 5), fix `README.md`. The `gstack-upgrade` to clear the 9 gstack diffs is the user's to run, separate from this repo.

## Phase 3 — Tier 1 ✅ COMPLETE (committed `02cc191`)

1. ✅ `CLAUDE.md` → `@AGENTS.md` import + Claude-specific notes only (D1)
2. ✅ `AGENTS.md` → the 59-line source of truth. Doc-map table regenerated against `guides/` (the `documentation/rules/` references are gone).
3. ✅ Root `MEMORY.md` → one-line index; graduation banner added (D18); zero PR numbers / branches (D19)

**Value:** Tier 1 goes ~6,200 → ~950 tokens, and the 12 hard rules become always-loaded. Five of them (`db:migrate` not `db:push`, `dotenv -o`, the two-Vite-configs constraint, Sentry-in-both, story-ID claiming) live **only in `memory/`** today and are violated by default on a first attempt.

**Stop here and:** you have the whole reliability win. Phases 4+ are automation.

---

## Phase 4 — Path-scoped rules ✅ COMPLETE

`paths:` frontmatter on all six guides; each symlinked (mode `120000`, not copied) into `.claude/rules/` (D6). One source of truth — edit the guide, never the link.

**Mechanism verified against the official docs before implementing** ([code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory)): rules **without** `paths:` load unconditionally at launch, at the same priority as `CLAUDE.md`. So frontmatter was mandatory — symlinking the guides without it would have added ~730 lines to *every* session, the opposite of the goal. Confirmed by observation: the five global `~/.claude/rules/` files have no `paths:` and do appear in every system prompt.

| Guide | Lines | `paths:` (all verified to match real files) |
|---|---|---|
| `coding-standards.md` | 71 | `app/**/*.{ts,tsx}` · `scripts/**/*.ts` · `server/**/*.ts` |
| `testing.md` | 47 | `**/__tests__/**` · `**/*.test.{ts,tsx}` · `vitest*.config.ts` |
| `frontend-components.md` | 52 | `app/client/**/*.tsx` · `app/client/**/*.css` |
| `observability.md` | **509** | `server/instrument.ts` · `app/entry.client.tsx` · `app/root.tsx` · `app/client/lib/logger.ts` · `app/server/shared/lib/{logger,langfuse,prisma}.ts` · `app/server/shared/middleware/{logger,telemetry,error-handler,security}.ts` |
| `posthog-integration.md` | 19 | `app/server/shared/lib/analytics.ts` · `app/client/provider.tsx` · `app/root.tsx` |
| `best-practices.md` | 32 | `app/server/shared/middleware/**` · `app/client/provider.tsx` |

**The ROADMAP's original globs were stale** and would have silently matched nothing: `app/server/middleware/**` (actually `app/server/shared/middleware/`), `app/server/lib/logger*` (actually `app/server/shared/lib/`), `**/posthog*` and `**/*auth*` (no such filenames exist — PostHog and Clerk are referenced *inside* files, not named by them). All 19 replacement patterns were machine-checked against `git ls-files`; every one matches ≥1 file.

**Biggest win:** `observability.md` is 509 lines. It now loads only when touching one of 11 instrumentation files, instead of never being found at all.

`.claude/` becomes a tracked directory here, so the per-machine state that previously sat only in `.git/info/exclude` (local, unshared) is now in `.gitignore` — worktrees, checkpoints, mailbox, `settings.local.json` and friends.

**Known limit:** path rules fire when Claude **reads** a matching file. "Write a new test" without reading an existing one may not trigger. This *complements* the AGENTS.md map, it does not replace it. Non-Claude agents (Codex, Cursor) ignore `.claude/rules/` entirely and rely on the doc map.

---

## Phase 5 — Generate the reference docs ✅ COMPLETE

`reference/api.md` from `npm run docs:generate` (already installed). `reference/schema.md` from a new `npm run docs:schema` over `prisma/schema.prisma`.

**Must precede Phase 7.** Otherwise the drift check fails permanently on docs not yet automated — and a permanently-red check gets ignored, which is worse than no check.

---

## Phase 6 — `map.yaml` + `log.md` ✅ COMPLETE

`documentation/map.yaml` — **16 nodes**, well under the 25 ceiling. `documentation/log.md` — append-only, columns date · action · nodes · story ID · PR number · note, **no commit SHAs** (D7). Neither file is ever loaded into agent context.

**`npm run docs:map:check` makes the map unable to rot silently.** It enforces five invariants, each corresponding to a way the draft had *already* rotted:

| Invariant | The rot it prevents |
|---|---|
| every `path` exists | the draft's `engagement` node pointed at `documentation/architecture/engagement.md` — **a file that has never existed** |
| every `covers_code` glob matches ≥1 tracked file | the draft's `**/posthog*` and `app/server/middleware/**` matched nothing, so those nodes silently covered no code |
| every `links` id resolves | dangling edges |
| a guide's `covers_code` **equals** its own `paths:` frontmatter | otherwise the Phase 4 rule scope and the map scope become two sources of truth — the exact failure this system exists to kill |
| node count ≤ 25 | unbounded growth past the AGENTS.md table budget |

Verified by fault injection: four faults introduced, all four reported with precise messages, then reverted.

**Changes from the draft**, all forced by measurement rather than preference:

- **`engagement` node dropped.** No architecture doc exists for game/engagement; the code is covered only by module READMEs. A node pointing at a missing file is precisely the drift this system catches, so the gap is recorded in `log.md` and the map's own comments instead of being faked.
- **Module READMEs are not nodes.** They are reached through the generic AGENTS.md row. Mapping five (and growing) of them individually would spend the node budget on the fastest-multiplying category.
- **`api` node's `generated` is `npm run docs:api`**, not `docs:generate` — the latter only writes `openapi.json` (D20).
- Added `application`, `api-routes`, `frontend`, `best-practices`, `tracker`; `documentation/concepts/**` joins stories/audits/research in the excluded set.

**Found while building it:** `guides/coding-standards.md` documented `course/chapters/` and `course/progress/` as sub-modules — both deleted — plus a `course/routes.ts` that never existed. Corrected in the same PR.

---

## Phase 7 — CI drift check ✅ COMPLETE

`scripts/ci/docs-drift.ts` + `.github/workflows/docs-drift.yml` + `npm run docs:drift`.

Its own workflow, **not** inside `ci.yml` — verified that `ci.yml` carries `paths-ignore: ["documentation/**", "**/*.md"]`, so a job added there would never run on the doc half.

**Scoped to complement `docs:map:check`, not duplicate it.** Structure (paths, globs, links, guide scope, ceiling) stays in the Phase 6 validator. This checks what rots *over time*:

1. every `npm run <x>` in AGENTS.md is a real script
2. every relative link in a mapped doc resolves
3. code covered by a node changed after that node's `verified_at`
4. a `generated:` doc was hand-edited
5. `CLAUDE.md` has not regrown from a pointer into a rulebook

**Staleness compares commit dates, not `--since`.** A commit on the same day as verification is not drift — the doc was confirmed that day. Verified by backdating the `schema` node: three failures, each naming the exact files and dates.

**It found real drift on its first run**, though not the one predicted: `application/admin-flow.md` linked to `./flows.md` three times — a file that has **never been tracked at that path**. Repointed to `onboarding-flow.md`, which is the doc it describes.

**The strictest check lives in the workflow, not the script:** regenerate everything and require no diff. That catches a hand-edited generated file, or a schema/route change made without running the generators — stronger than anything assertable from inside the script.

---

## Phase 8 — Generated projections ✅ COMPLETE

`npm run docs:map` writes both artefacts an agent actually reads, between generated markers:
1. the doc-map table in `AGENTS.md` (17 rows)
2. a **Related** footer in each node's entry doc — 16 files, 35 links, all resolving

**Not optional polish.** `map.yaml` is never loaded into context, so without rendered footers the `links` graph is unreachable and the system offers single-doc lookup only, never traversal.

**The seven guides are deliberately *not* in the table.** They are `tier: 3`, reached in one hop from `documentation/rules/README.md` — because Claude Code already auto-loads each one via `.claude/rules/` when you touch a file it covers, so a row for it is redundant there, and other agents only need the index. That took the table from 17 rows to 11 and saves ~90 tokens on every message. `tier` was already the mechanism for this; it simply was not being used.

**Added a `task:` field to every node.** Generating the table from `triggers` alone would have replaced good prose ("A field, column, model or enum") with a keyword dump. `task:` is the human-authored row label; `triggers` stay as matching surface. Generated *and* readable.

**Promoted two sub-paths to nodes** — `session-start-pipeline.md` and `prompts/README.md`. Both were rows in the hand-written table but not map nodes, so generating purely from the map would have silently dropped them. 18 nodes now, ceiling 25.

**Ordering constraint discovered:** `docs:schema` and `docs:api` rewrite their files wholesale, which wiped the footer markers. Both generators now emit the marker pair themselves, and `docs:reference` runs schema → api → map so the footers are refilled last. Verified idempotent: the working tree is byte-identical after a second run.

Created `documentation/architecture/session/README.md` and `documentation/application/README.md` — both directories were mapped but had no entry file for a footer, and the session directory had nine files with no index.

---

## First live test — S-070, unattended ✅ (2026-07-22, PR #128)

The first story to hit the system was **not** one of this project's own. S-070 refactored seven session components across `app/client/**`, tripping the staleness check on three nodes. The result:

| | |
|---|---|
| Nodes bumped | `application`, `coding-standards`, `frontend` |
| Docs actually rewritten | `architecture/session/05-live-session.md` **+70**, `guides/testing.md` **+41**, `architecture/build-runtime-config.md`, `application/cicd.md`, `setup/backend-ecr-deploy.md` |
| Rubber-stamped? | **No** — real prose changed alongside every `verified_at` bump |
| `log.md` appended | **No** ⬅ |

**The check fired, was satisfied honestly, and CI stayed green** — the loop works end to end with no author from this project involved. The one gap is the one manual step: `log.md` was not appended, so transaction time (D8) has no record of the supersession. That is precisely the step Phase 9 automates, and it is now evidence rather than prediction.

---

## Phase 8.5 — Naming + one memory store ✅ COMPLETE — verified 2026-07-28

Implements **D22** and **D24**. Both are renames-and-merges with zero open questions, and both shrink what Phase 9 has to reason about — so they land first.

1. ✅ `documentation/guides/` → `documentation/rules/`; 7 entries relinked in `.claude/rules/`; `map.yaml` carries **zero** references to the old path. The 10 files still naming `documentation/guides` are all legitimately historical — `stories/**` (frozen log), `concepts/**` (excluded proposals) and `log.md`, where an old path is *correct* for the date it records.
2. ✅ Provider-only memory entries merged into repo `memory/`, provider store reduced to a pointer, stale "Phase 5 · 16 decisions" index line gone. Detail and the one remaining loose end (the dated archive directory) are in **D22**.
3. ✅ `CODE-AGENT-INSTRUCTIONS.md` is a node — `map.yaml:60`.

## Phase 8.6 — Make the drift check honest ✅ COMPLETE — implements D26

Found by measurement, not planning: replaying S-070's diff against the map showed `coding-standards` was never bumped yet CI was green. Cause and fix in **D26** — two glob engines, one of which silently matched nothing.

1. `docs-drift.ts` resolves globs with minimatch, the same engine `check-map` uses. One `git log` per run instead of one per glob.
2. New check 3b — every glob must match ≥1 tracked file *through the drift check's own engine*.
3. `minimatch` promoted from six-level transitive to a declared devDependency.
4. Both new checks carry a negative test proving they can fail.

**What breaks if you stop here:** nothing — this is the phase that makes everything before it trustworthy. Skipping it means every later phase builds on a check that under-reports.

## Phase 8.7 — Concept nodes ⬜ — implements D8's join

Implements **D21** and **D23**. This is the graph, and it must exist before Phase 9 because `doc-sync` reads it.

1. Promote `MODEL_GROUPS` (8 domains, all 43 models) out of `generate-schema-doc.ts` into `map.yaml` as `kind: concept` nodes; the generator imports them back, so the ERD grouping and the graph cannot diverge.
2. Validate `models:` against the parsed Prisma schema in `docs:map:check` — unknown or unassigned model fails the build. This is what keeps the graph honest without a database.
3. Add `docs:overlap` — warn on overlapping `covers_code` or shared `triggers` (D23; warn, never fail).
4. Emit a concept→docs→code projection so the graph is inspectable without reading YAML.

Concept nodes are a second axis and do **not** count against the 25 doc-node ceiling.

---

## Phase 9a — `doc-sync`, the deterministic half ✅ COMPLETE — implements D27

`npm run docs:sync`. Answers "what documentation does my change affect?" while the change is still in your head — the same map and the same matcher as `docs:drift`, at the opposite end of the loop.

**Extracted `scripts/docs/map-lib.ts` first.** Building a second matcher next to the one just fixed in D26 would have re-created that exact bug. `check-map`, `docs-drift` and `sync` now share one `covers()`.

Verified by replaying S-070 (PR #128), the story that motivated it: doc-sync names **all six** nodes that story needed — `api` (regenerate), `session`, `testing`, `coding-standards`, `api-routes`, `frontend` — which its author had to work out by hand, and prints the `log.md` line they never appended.

It also found a live map hole on its first real run: `.cursor/rules/*.mdc` are pointer files into `documentation/rules/` that no node claims, so a doc rename breaks them silently.

**What breaks if you stop here:** nothing, but every story keeps paying the manual cost S-070 paid.

## Phase 9b — LLM prose patching ⬜ BLOCKED — needs section markers

The original Phase 9 spec has doc-sync patch prose **only inside `<!-- MODULE:x:START/END -->`**. There are **zero** such markers in the 14 mapped prose docs — the only file mentioning `MODULE:` is this ROADMAP, which invented them.

So this cannot be built as specced. The two honest options are to add markers first (a real task: deciding which prose maps to which code, at sub-document granularity — effectively concept edges, so it wants Phase 8.7 done) or to let an LLM rewrite whole documents, which D9 explicitly rejected.

**Do not start this before Phase 8.7.** Markers and concept nodes are the same mapping at two resolutions; designing them separately guarantees they disagree.

Global skill, gstack-shaped (frontmatter + `bin/` scripts + a deterministic preamble). **Procedure global; `map.yaml`, markers and `log.md` repo-local** — otherwise it hardcodes Panya's shape and cannot be reused.

**Phase 0 — preamble, pure bash, zero LLM:**
```bash
STORY=$(git log -1 --format=%b | grep -oE 'S-[0-9]+' | head -1)
BASE=$(git merge-base HEAD origin/main)
git diff --name-only $BASE..HEAD
git log $BASE..HEAD --format='%h %s'
yq '.nodes[]' documentation/map.yaml
tail -20 documentation/log.md
```

**Phase 1 — match:** changed paths × `covers_code` globs. Deterministic, no judgment.

**Phase 2 — act per node:** `generated:` → re-run the command, never LLM-write. Prose → patch **only inside `<!-- MODULE:x:START/END -->`**. No match → **stop and report a map hole**, do not invent a node.

**Phase 3 — graduate memory (D18).** The same trigger, in the same pass — splitting them means the second never happens:

- implementation notes in `memory/project_*` for this story → fold into the doc that now describes it, then **delete the memory file**
- rationale → `documentation/decisions/` if not already there
- traps and surprises → **stay** in `memory/feedback_*`
- status, branch names, PR numbers → **delete** (D19 — derivable from git)

**Phase 4 — record:** append to `log.md` (story ID + PR number), bump `verified_at`, refresh the tracker's generated status column.

**Phase 5 — verify:** run `npm run docs:drift`. A failure means the skill's own output was wrong.

**Four safety rules:**
1. **Grep before generate.** Every claim traces to command output. The failure mode of an LLM doc-updater is confident paraphrase; deterministic input is the only defence.
2. **Bounded writes.** Outside the markers is human territory. Without this, one bad run silently eats a hand-written caveat.
3. **Deletion is first-class.** A refactor that removes a field must remove the doc claim. Additive-only regrows the pile Phase 1 just cut.
4. **Refuse over guess.**

**Prerequisite:** `MODULE:` markers must exist. Pilot on **one** doc, prove it, then widen.

---

## Phase 10 — Weekly lint ⬜ PENDING

Scheduled job: staleness report grouped by owner, **plus an LLM contradiction pass** over the mapped set (D10). Filed as one recurring GitHub issue, not a red cron job nobody reads.

---

---

## Phase 11 — Portable setup: publish skills, harden `~/.agents` 🟡 IN PROGRESS — 11a/11c/11d/11e/11f done, 11b partial, 11g pending

Per D13, D16 and **D25**. End state: a new machine is productive after `git clone ~/.agents && ./setup.sh`.

**11c — Cut global `CLAUDE.md` down to what is actually global (D25). ✅ DONE.** Edited `~/.agents/WORKFLOW.md` + `providers/claude.md` at source, rebuilt via `build.sh`, verified byte-equal via `check.sh`. Deleted the agent table; compressed three tables to prose; **no rule deleted, only de-duplicated** (the `main`/`eslint`/`prettier` floors survive for greenfield projects). −13% tiktoken / ≈−340 tokens on Claude's tokenizer. See D25.

**11a — Own skills → `custom-skills/`. ✅ DONE (2026-07-28).** *(corrected: the superseded plan said a separate `~/dev/agent-skills` repo; the D16/decision-block resolution is `~/.agents/custom-skills/` — one repo now, split only if publishing ever earns it.)*
1. ✅ `~/.agents/custom-skills/` created; **19 authored skills** moved there via `git mv`, leaving **16 third-party** in `skills/`. The split was derived mechanically, not by name-guessing: every skill in `.skill-lock.json` is third-party, everything else is ours. That makes "which skills did I write?" a machine-answerable question, which is the point of the split.
2. ✅ Path leak stripped — it was a comment example (`-Users-db-Work-Arcitae-astro-astro-app`), and a full re-scan of `custom-skills/` is clean.
3. ❌ **Step 3's premise was wrong on both counts — do not do it.** Tested with a throwaway probe skill, then reverted:
   - `skills add` **symlinks by default**; `--copy` is the opt-in flag. The "it copies, so the dev loop is edit → re-add" warning was backwards.
   - But it **copies the skill *into* `~/.agents/skills/`** — the third-party store — and fans symlinks out from there. Using it for our own skills would mean two copies of each (the `custom-skills/` original we edit, and a stale copy the agents read). That is precisely the duplication 11e exists to remove.
   - `-a '*'` means *every agent on the machine*: the probe landed in **54 directories** (`~/.roo`, `~/.trae`, `~/.grok`, `~/.tabnine`, `~/.junie`, `~/.qoder`, `~/.snowflake/cortex`, `~/.config/devin`, …), nearly all for agents we do not use.
   - Local-path installs are **not** recorded in `.skill-lock.json` (count stayed at 16), so there is no `update`/versioning benefit either — and the lock file survives as a clean provenance oracle only by accident.
   - **Conclusion:** the `skills` CLI is for *consuming* third-party skills from GitHub. `setup.sh` links our own per-skill instead — one symlink per skill, never the whole directory, which also preserves each host's own entries (`~/.codex/skills/codex-primary-runtime`, `.system`). Same reasoning the rules distribution already used.
4. ⬜ Publish later, curated — **never `~/.agents` wholesale** (552 scripts, a vendored gstack copy); the agent id is `claude-code`, not `claude`
5. ✅ `skills/` is now third-party only; `.skill-lock.json` stays where it is and is the provenance marker.

**11b — `~/.agents` becomes the setup repo. 🟡 partly done by 11a.**
- `WORKFLOW.md`, `providers/`, `build.sh`, `rules/` — plus rules distribution added to `build.sh` (D14)
- ✅ `setup.sh` provisions a fresh machine: per-skill symlinks from `custom-skills/`, then `build.sh`, then `check.sh`. **Not** `npx skills add` — see 11a step 3 for why that was tested and rejected.
- 🟡 `README.md` — the skills tree, distribution table, install steps and add-a-skill recipe were corrected in 11a (they described a whole-directory symlink that never existed). The rest of the "documents the finished state as if it exists" problem is untouched.
- ⬜ Open: `build.sh` has `RULE_HOSTS=(claude codex)`, so Gemini gets a generated config but no rules and no skills. Decide whether that is intentional.

**11d — Demote tech-stack rules to the repo (D30). ✅ DONE.** The repo homes for `clerk-auth-refs` + `css-ternary-classname` were added to `documentation/rules/frontend-components.md` (branch `chore/rules-skills-consolidation`); `clerk-user-resolution` + `prisma-migration-workflow` are already in `AGENTS.md`. The global delete landed human-applied in `~/.agents` commit `e4db0eb`: `~/.agents/rules/` is now **`codegraph.md` only** — the intended end state. Repo-add landed before global-delete so nothing was lost in the window. Confirms the per-file distribution choice: `~/.codex/rules/default.rules` (Codex's own allowlist) survived untouched, which a directory symlink would have buried.

**11e — Workflow commands → `user_invocable` skills (D29). ✅ DONE (2026-07-28).** All seven now live in `custom-skills/` and are linked into `~/.claude/skills` and `~/.codex/skills`; `~/.claude/commands/` is empty.

**It was not a conversion — it was a de-duplication.** The seven skills already existed, byte-identical to the commands apart from a mechanical slug rename (`prd`→`product-requirements`, `review`→`pr-review`, …), and **no provider linked them**. So the live copy was the command and the skill copy was dormant: editing `/prd.md` silently staled its twin. That is the duplication D23/D26 exist to catch, sitting inside the agent-docs system itself. The commands were the better source — the rename had been a blind find-replace that corrupted prose, rewriting the literal word "TRD" in `<PRD/TRD/Story reference>` into `<PRD/technical-requirements/Story reference>`.

**D29's typed-verb promise holds six times out of seven.** `/prd`, `/trd`, `/discover`, `/retro`, `/decision-doc`, `/memory-review` type exactly as before. **`/review` could not**: it is a Claude Code **built-in** ("Review a GitHub pull request"). A command *shadows* a built-in; a skill does *not* — so deleting `review.md` made our skill unreachable behind the built-in. Restored as `pr-review`, which is very likely why it carried that name originally. **This is a real gap in D29**, which assumed commands and skills are interchangeable for typing. They are not: check for a built-in collision before retiring any command. Consequence: five `` `/review` `` references in `WORKFLOW.md` and `providers/{codex,gemini}.md` were repointed to `/pr-review`.

⬜ Still open: command-distribution in `build.sh` (`~/.codex/prompts/`) for any macro that stays a command — currently there are none left. The "convert `/decision-doc` first and watch it" pacing was overtaken: with the skills already written and dormant, the risky step was de-duplicating, not converting.

**11f — Prune unused skills + irrelevant plugins (D30 tail). ✅ DONE (2026-07-28).** The four skills — `knowledge-organization`, `skill-routing`, `product-manager`, `quality-check` — are deleted from `~/.agents/skills/` and unlinked from both `~/.claude/skills` and `~/.codex/skills`. Kept `coding-standards` / `hono-react-router-prisma-stack` / `product-analytics`, which repo rules delegate to.

Two corrections to the spec, both found by checking before deleting:

- **"unused *and* unreferenced" did not hold for `knowledge-organization`.** `project-memory/SKILL.md` — a skill we keep — carried an "Integration with Knowledge Organization" section describing the boundary between them. Deleting the skill would have orphaned it, the same failure D30 avoided for `coding-standards`. Resolved by deleting the skill *and* the six-line section. (`product-manager` and `quality-check` were referenced only by `skill-routing`, which went with them; the apparent `skill-routing` hits in gstack were false positives — gstack's own `skill-routing-e2e.test.ts` naming.)
- **`rust-analyzer-lsp` was already disabled** at `~/.claude/settings.json:88`. The token win was already banked; what remains is a plugin-manager-owned cache directory, left alone deliberately rather than hand-deleted.

**Deleting a skill is three places, not one.** Removing the source and the `~/.claude/skills` symlink left **dangling symlinks in `~/.codex/skills`** — invisible to `ls`, which happily prints broken links, and invisible to `[ -e ]`, which reports false for them. Sweep with `find <dir> -maxdepth 1 -type l ! -exec test -e {} \; -print` across *every* provider dir after any skill removal.

Honest sizing: ~150 tokens off the always-loaded set — modest. The real gain is that `skill-routing` was a router pointing at two skills that no longer existed; removing a wrong map beats the token count.

**11g — Docs scaffolding, only once proven.** A `docs-init` skill scaffolding `documentation/{reference,product,rules}/`, `map.yaml`, `log.md` and the `AGENTS.md` skeleton. *(Was a second "11c" — id collision fixed.)*

**Deliberately sequenced after Phase 9.** Packaging an unproven structure into the setup repo exports a mistake to every future project. Prove it here, then generalise. This is the "global as setup, local as needs" goal — earned rather than assumed.

## Phase 12 — Workflow enforcement ⬜ PENDING — **last, highest blast radius**

Per D15. Enforce at the **artifact**, not the agent — CI is the only cross-agent gate.

**12a — CI story-first check (safe, universal).** Fail a PR that touches `app/` with no `documentation/stories/<feature>/S-NNN/` and no `PROJECT-TRACKER.md` row. Catches every agent and every human. This is most of the value.

**12b — Claude `PreToolUse` hook (Claude-only, risky).** Warn on `Write`/`Edit` when no story exists. **Advisory for at least one week before considering blocking.** A misfiring blocking hook halts all work mid-task with no obvious cause.

**12c — Do not attempt uniform enforcement across agents.** Claude has hooks, Codex has its own mechanism, Cursor has no equivalent. Chasing parity here costs more than it returns; CI already covers the gap.

**Open for your decision:** whether the lifecycle itself is right is a separate question from whether it is enforced. Enforcing a wrong workflow is worse than an unenforced good one. Recommend running 12a advisory-only for a month and reading what it flags **before** deciding the workflow is correct.

### Parked for a later session — workflow design framework

**Not being worked on now. Recorded so it is not lost.**

The open question is bigger than enforcement: *what is the right way to design and run a multi-step agent workflow at all?* Sequenced steps that cannot be skipped, each gated on the previous completing, with a per-task agent rather than one generalist.

Evidence this is worth real time (D17): `reviewer` ran 21×, `researcher` 13×, but **`qa` ran once** despite the documented lifecycle requiring it after every task. The instruction is loaded into every session and does not happen. That is a design problem, not a discipline problem.

Things to look at when this session happens:
- Whether the phases should be **agents** (one per step, with its own context and tools) rather than prose steps — the four existing agents are a partial version of this already
- Hook-based gating: `PreToolUse` blocking implementation until a story file exists
- State that survives across sessions — a workflow is useless if `/compact` loses which step you were on
- Existing frameworks worth evaluating before hand-rolling: the gstack `autoplan` pipeline chains reviews in sequence and is worth reading as prior art
- The honest counter-case: rigid sequencing costs speed on small changes. The current workflow already carves out "bug fix or < 30 min task → skip PRD/TRD". Any enforced pipeline needs the same escape hatch or it will be routed around.

---

## Open questions still unanswered

Carried from `OPEN-QUESTIONS.md`; the first still blocks Phase 6.

1. **✅ RESOLVED 2026-07-20 — v7 is current.** Confirmed by DB. Consequences to apply in Phase 3/6:
   - `documentation/architecture/README.md` is titled "(v6)" and must be retitled or rewritten to v7
   - `product/spec/v7/` is authoritative; the `v8-modular` prompt work is a prompt-assembly change, not a spec generation
   - `architecture/session/01,02,03,06,07,08` (all 2026-05-08) still need a human pass before their `verified_at` means anything — v7 being current does not make a May doc verified
   - This unblocks Phase 6
2. **Games live in another repo.** Nothing here says so, so agents keep concluding they are unbuilt. Needs one pointer line; I would be inventing the repo name.
3. **`architecture/engagement.md`** is a map node pointing at a file that does not exist. Write it, drop the node, or point at the module READMEs.
4. **`documentation/audits/`** — 9 one-off analyses. Historical (→ `stories/`) or living reference (→ map node)?
5. **`session-1-hindi.txt`** — 12-line divergence between doc and seed copy. You are checking whether it is recent in-flight work.
