# Agent Documentation System — Proposal

Status: **Phase 1 complete (audit).** Phases 2–4 pending your go-ahead.

Every claim below cites a file I read. Nothing in this repo was modified.

---

## Phase 1 — Audit

### 1.1 Repo shape

| Thing | Value | Source |
|---|---|---|
| Language | TypeScript only, ESM (`"type": "module"`) | `package.json:6` |
| Node | `>=24 <25`, `.nvmrc` | `package.json:8`, `.nvmrc` |
| Frontend | React 19.2, React Router 7.11 (SSR, flat file routes), Tailwind 4.1 | `package.json` deps |
| Backend | Hono 4.10, hono-openapi 1.1, Zod 4.2 | `package.json` deps |
| ORM/DB | Prisma **7.8.0 (pinned exact)** + `@prisma/adapter-pg`, PostgreSQL, 43 models, latest migration `20260718114005_s067_envelope_materialized_plan` | `package.json`, `prisma/schema.prisma`, `prisma/migrations/` |
| Auth | Clerk (`@clerk/react-router` 2.4, `@clerk/backend` 2.32, `@hono/clerk-auth`) | `package.json` |
| Observability | Sentry 10.65 (pinned exact), OTel, Langfuse 5.9, PostHog, Pino 10.3 | `package.json` |
| Package manager | **npm** (`package-lock.json` 731 KB, CI runs `npm ci`) — but a stale `pnpm-lock.yaml` (455 KB, last touched 2026-07-14) also sits in root | root `ls`, `.github/workflows/ci.yml:24` |
| Test runner | Vitest 3.0 | `package.json`, `vitest.config.ts` |
| Lint / format | ESLint 10 (flat config, `app/` only) + Prettier 3.8, husky + lint-staged pre-commit | `eslint.config.js`, `package.json:lint-staged` |
| Build | Vite 7 / react-router build; second Node path via `vite.config.node.ts` + esbuild bundle of `server/entry.ts` | `package.json:scripts` |
| CI | GitHub Actions: `.github/workflows/ci.yml`, `deploy-backend.yml`, `deploy.yml` (retired CF) | `.github/workflows/` |
| Deploy target | Node.js Docker → ECR → ECS Graviton ARM64 | `README.md:3`, `.github/workflows/deploy-backend.yml` |

**Single package, not a monorepo.** One `package.json`. Logical split is by path alias only: `@frontend/*` → `app/client`, `@backend/*` → `app/server`, `@shared/*` → `app/shared` (`AGENTS.md:13`).

Server modules actually on disk (17): `avatar, cohort, consent, course, docs, engagement, enrollment, game, health, payment, session, simulate, subscription, syllabus, tutor, user, webhook` (`ls app/server/modules`).

### 1.2 Command inventory

All verified against `package.json:scripts` unless noted.

| Purpose | Exact command | Verified |
|---|---|---|
| Install | `npm ci` | `.github/workflows/ci.yml:24` |
| Dev | `npm run dev` | ✅ real script |
| Typecheck | `npm run typecheck` | ✅ real script — **but see drift D7** |
| Lint | `npm run lint` (`eslint app/`) | ✅ |
| Format check (read-only) | `npm run check:all` | ✅ |
| Format staged | `npm run check` (lint-staged) | ✅ |
| Test | `npm test` / `npm run test:unit` (both `vitest run`) | ✅ |
| Single test | `npx vitest run path/to/test.ts` | ✅ |
| Build (deployed path) | `npm run build:node` then `npm run start:node` | ✅ — this is what `Dockerfile` ships |
| Build (RR default) | `npm run build` | ✅ — what CI runs |
| DB migrate | `npm run db:migrate` | ✅ |
| DB generate | `npm run db:generate` | ✅ |
| DB seed | `npm run db:seed` (+ `db:seed-syllabus`, `db:seed-templates`) | ✅ |
| Seed validation | `npm run validate:seeds` | ✅ (not in CLAUDE.md) |
| Curriculum gen | `npm run curriculum:generate` / `:diff` / `:seed-json` | ✅ (not in CLAUDE.md) |
| API docs | `npm run docs:generate` | ✅ |

**Commands in docs that are broken or misleading:**

- `CLAUDE.md:27` — `Deploy | npm run deploy`. That script is `npm run build && wrangler deploy` (`package.json`). Cloudflare Workers was **retired** by DEC-001 (`documentation/decisions/DEC-001-drop-cf-workers-backward-compat.md:9`). Real deploy is a git push handled by `.github/workflows/deploy-backend.yml`. An agent told to "deploy" today would run a CF deploy.
- `CLAUDE.md:10` — `Dev (Worker) | npm run dev:server` = `wrangler dev`. Same problem: DEC-001 says `wrangler dev` no longer needs to work, and explains exactly why the Prisma client crashes at boot under workerd.
- `README.md:141-147` — same `npm run dev:server` presented as a supported alternative.
- `README.md:126` — "More details: see `DATABASE_SETUP.md`" — file does not exist.

### 1.3 Existing agent context files

Checked with `ls -la`. **No symlinks anywhere.** Every file is real and independently maintained — this is the drift engine.

| File | Lines | ~Tokens | Loaded when | Notes |
|---|---|---|---|---|
| `CLAUDE.md` | 39 | ~900 | always | Points at AGENTS.md. Commands table only. |
| `AGENTS.md` | 107 | ~2,000 | always (via CLAUDE.md:3) | The real Tier-1 file today. |
| `MEMORY.md` (root) | 52 | ~3,300 | always (project-memory skill) | Dense; long paragraph entries, not an index. |
| `memory/*.md` | 37 files, 1,401 lines | ~35k | on demand | Real memory store. |
| `TODOS.md` | 204 | ~4,500 | ambiguous | Nothing declares when to read it. |
| `.cursor/rules/*.mdc` | 6 files, ~30 lines total | ~600 | Cursor only | **Good pattern** — each is a 6-line stub pointing at `documentation/rules/<x>.md`. No duplicated content. |
| `.claude/settings.local.json` | — | — | — | Local permissions, not context. |
| `.github/copilot-instructions.md` | — | — | — | **Does not exist.** One less thing to sync. |

Effective always-on load today: `CLAUDE.md` + `AGENTS.md` + `MEMORY.md` ≈ **6,200 tokens**, before a single task-specific doc.

**Rules that appear in more than one file:**

| Rule | Copies | Agree? |
|---|---|---|
| Env single-source `.env.local` | `AGENTS.md:36-73`, `README.md:66-72`, `CLAUDE.md:31-32` | Yes — README correctly defers to AGENTS.md |
| Tech stack listing | `AGENTS.md:5-16`, `README.md:11-44`, `documentation/rules/tech-stack.md` (475 lines) | **No** — see D2, D3 |
| Runtime/deploy target | `AGENTS.md:3`, `README.md:3`, `MEMORY.md:8` | **No** — see D1 |
| Quality gates | `AGENTS.md:78`, `CLAUDE.md:5-29`, `~/.claude/CLAUDE.md` | Yes |
| Doc index | `AGENTS.md:92-107`, `.cursor/rules/*` | Yes |

The `.cursor` stub-pointer pattern already solves cross-tool sync correctly. The three markdown files that *do* duplicate prose are the ones that disagree.

### 1.4 Documentation inventory

**786 markdown files, 141,595 lines.** For scale: that is roughly 3.5 million tokens of prose against a ~40k-line application.

| Area | Files | Lines | What it is |
|---|---|---|---|
| `documentation/stories/` | 549 | 58,774 | Per-story PRD/TRD/task/summary. Append-only work log. |
| `documentation/flow/` | 76 | 41,442 | **v1 → v7 product spec generations, all retained side by side.** |
| `documentation/prompts/` | 31 | 17,349 | Dated prompt snapshots + testing transcripts. |
| `documentation/application/` | 8 | 4,972 | schema / admin-api / onboarding-api / subscription-api / flows. |
| `documentation/architecture/` | 20 | 4,658 | Current-state architecture, incl. `session/01-09`. |
| `documentation/rules/` | 9 | 1,959 | The Tier-2 layer that already exists and works. |
| `documentation/audit/` + `audits/` | 9 | 1,852 | **Two directories, near-identical names.** |
| `memory/` | 37 | 1,401 | Repo-local memory. |
| `docs/superpowers/` | 2 | 1,390 | Orphan — a second top-level docs root. |
| `prisma/` READMEs | 6 | 2,855 | Seed docs. |
| `app/**/README.md` | 8 | 271 | Per-module. Oldest: `app/shared/README.md` 2025-12-10. |
| Root loose | 4 | ~750 | `random-commands.md` (262 lines), `TODOS.md`, `README.md`, `MEMORY.md` |

**388 of 786 docs (49%) have no commit since 2026-06-01.** 15 are untracked entirely (`.superpowers/`, `documentation/prompts/testing/*`, this brief).

Age outliers where the doc describes code that moved after it:

| Doc | Doc last commit | Code it describes, last commit |
|---|---|---|
| `documentation/application/schema.md` (831 lines) | 2026-05-12 | `prisma/schema.prisma` → 2026-07-19 |
| `documentation/application/admin-api.md` (710) | 2026-03-03 | `app/server/modules/` → active weekly |
| `documentation/application/subscription-api.md` (1,051) | 2026-03-03 | ditto |
| `documentation/application/onboarding-api.md` (611) | 2026-03-03 | ditto |
| `documentation/application/onboarding-flow.md` (714) | 2026-03-12 | ditto |
| `app/shared/README.md` | 2025-12-10 | `app/shared/` → active |

Four API/schema docs totalling **3,203 lines** are 4+ months behind code that changes weekly. These are exactly the "agent obeys it confidently" hazard from your finding #1.

### 1.5 Drift evidence

Specific, with paths and line numbers.

**D1 — Three files disagree about what this app *is*.** The single highest-cost error in the repo.
- `AGENTS.md:3` — "Runs as a **single Cloudflare Worker**"
- `MEMORY.md:8` — "The app runs as a single Cloudflare Worker"
- `README.md:3` — "deployed as a **Node.js Docker container on AWS ECS**"
- `documentation/decisions/DEC-001…:9` (2026-07-08, 🔒 Decided) — "Cloudflare Workers deployment is no longer a target."

README is right. The two always-loaded agent files are wrong, and they are wrong at line 3, in the first paragraph an agent reads.

**D2 — `README.md:26,39,41,43` names four dependencies that are not installed.** `livekit-client`, `@deepgram/sdk`, `@google-cloud/text-to-speech`, and HeyGen. None appear in `package.json`. Meanwhile `AGENTS.md:3` says the stack is "avatar.taiboli.in + Deepgram STT + Portkey LLM gateway", and `package.json` actually contains `openai`, `werift` (WebRTC), and `opusscript`. Two docs, two different and both-unverifiable AI stacks.

**D3 — `AGENTS.md:7` points at `app/worker/app.ts`, which does not exist.** The only file under `app/worker/` is `clients/openai.worker.ts`. The real (and per DEC-001, dead) Worker entry is `workers/app.ts`. Wrong path *and* wrong architecture in one line.

**D4 — `AGENTS.md:9` module list is stale in both directions.** It lists `websocket`, which is not a module on disk. It omits 7 that are: `avatar`, `consent`, `engagement`, `enrollment`, `game`, `simulate`, `syllabus`.

**D5 — `README.md:189-192` links four root docs that do not exist:** `ARCHITECTURE.md`, `DATABASE_SETUP.md`, `AUTH_DEBUG.md`, `API_DOCS_SETUP.md`. Also referenced at `README.md:126`. This is the last section of the README — the "where do I go next" section.

**D6 — `documentation/architecture/README.md:1` is titled "(v6)"** while `documentation/flow/v7/` exists (2026-06-29) and active story work is on the v8-modular prompt (`documentation/prompts/v8-modular/`, `memory/project_v8_modular_prompt.md`). The doc an agent is sent to for architecture is two generations behind the directory tree next to it.

**D7 — `CLAUDE.md:12`'s typecheck command is not the one CI runs.** `npm run typecheck` starts with `wrangler types` (CF codegen, needs `.dev.vars`). CI deliberately skips it: `.github/workflows/ci.yml:33` comments "Skip wrangler types (needs .dev.vars)" and runs `npx react-router typegen && npx tsc -b`. So the documented local gate and the actual merge gate are different commands, and the local one depends on the retired runtime.

**D8 — Two audit directories.** `documentation/audit/` (7 files, 2026-06-17) and `documentation/audits/` (2 files, 2026-07-08). Nothing distinguishes them. An agent grepping for audits finds one and stops.

**D9 — Stale `pnpm-lock.yaml` in root** alongside the authoritative `package-lock.json`. CI uses npm. An agent that spots the pnpm lockfile may run pnpm and resolve a different tree.

**D10 — `documentation/rules/mvp-requirements.md`** (418 lines, last commit 2026-03-01) is still wired into the always-on path via `.cursor/rules/mvp-requirements.mdc` (`alwaysApply: true`). It describes MVP scope from ~4.5 months ago, well before v6/v7.

### 1.6 Non-obvious rules — the highest-value content

These are things that look wrong to an outsider but are load-bearing. Recovered from `AGENTS.md`, decision docs, `memory/`, and CI comments. This is the material that must survive into Tier 1.

1. **Never `db:push` on a feature branch — always `db:migrate`.** `db:push` leaves no migration file and breaks CI deploy. (`memory/feedback_db_push_vs_migrate.md`, `MEMORY.md`)
2. **`dotenv-cli` needs `-o` to override the shell.** Every db script uses `dotenv -o -e .env.local`. Without `-o` a stale `~/.zshrc` export silently wins — this cost hours on a phantom Azure 401. (`memory/feedback_env_local_must_override.md`)
3. **`DEPLOYMENT_ENVIRONMENT` and `VITE_ENVIRONMENT` must never be merged.** `VITE_*` is build-time inlined into the Docker image, and `VITE_ENVIRONMENT` doubles as an **access gate** in `app/server/modules/simulate/handlers.ts`. An observability tag must not be an authorization input. Anything varying per deploy cannot be `VITE_`-prefixed. (`AGENTS.md:48-64`)
4. **Never merge the two Vite configs while `server/entry.ts` exists.** The `reactRouterHonoServer` plugin changes what `build/server/index.js` *is*, and dev cannot reproduce the breakage. (`MEMORY.md`, DEC-003)
5. **Sentry build wiring must live in *both* Vite configs or `build:node` dies.** (`MEMORY.md`)
6. **Do not reintroduce a repo-wide `prettier --write .`.** It rewrites hundreds of unrelated files including any worktree under `.claude/`. (`CLAUDE.md:37-39`)
7. **`user_consents` is canonical**; no new runtime reads from `consent_grants`. (`MEMORY.md` Durable Rules)
8. **Clerk `userId` ≠ Prisma `User.id`.** Resolve via `vendorId` lookup first. (global rule; reference impl `app/server/modules/family/routes.ts`)
9. **CSP: `style-src 'unsafe-inline'` is deliberate** — Clerk requires it; hash and nonce are both provably impossible there. Do not "fix" it. (`memory/project_csp_nonce.md`)
10. **Claim a story ID with a `PROJECT-TRACKER.md` row before implementation.** An ID living only in a branch or issue is not claimed — S-064 collided twice. (`MEMORY.md`)
11. **Generated, never hand-edit:** `worker-configuration.d.ts` (486 KB), `.react-router/`, `app/generated/`, `*.tsbuildinfo`, TypeDoc output.
12. **Prompt templates: DB version wins over KV, and KV keys must be versioned** (`prompt-template:<name>:v<version>`). Deploy does not insert prompt content rows — the seed step must run after migrations. (`MEMORY.md`)

Items 1–5 and 10 exist **only** in `memory/` or a decision doc today. None is in `CLAUDE.md`. Every one of them is a rule an agent will violate on a first attempt.

---

## The thing you did not want to hear

Your brief frames this as an indexing problem. It is mostly a **deletion** problem.

`documentation/flow/` holds 76 files and 41,442 lines of superseded product specs — v1, v2, v3, v4, v5, v6, v7, plus five separate hand-written diff documents between generations (`v4-vs-v5-diff.md`, `v4-vs-v5-diff-gemini.md`, `v4-vs-v5-detailed-diff.md`, `v5-v6-diff-claude.md`, `v5-v6-diff-codex.md`). That is 29% of all documentation lines, and all but `v7/` is history that git already stores. No map, no tier, and no `verified_at` field makes a superseded v4 spec safe — it makes it *findable*, which is worse. An agent grepping "universal core" today hits six versions of it and has no signal which one the code implements.

The same holds for `documentation/prompts/onboarding-session-prompts/` — 15 dated snapshots of the same prompt, 5,000+ lines, when the authoritative copy lives in `prisma/seed/data/prompt-templates/` and is what actually runs.

A map over 786 documents is a map of a landfill. My Phase 3 recommendation will be to delete or archive roughly 120 files before mapping anything — and I want you to know that up front, because if you are not willing to delete, the rest of the system will not hold.

Second, smaller: **the top-level file is not your problem.** `CLAUDE.md` is 39 lines and already under your 60-line budget. The failure is that it is 39 correct-looking lines with a retired deploy command in it, sitting above a 107-line `AGENTS.md` whose first paragraph names the wrong runtime. Shrinking Tier 1 further buys nothing. Making it *true*, and keeping it true, is the whole job.

---

---

## Phase 2 — external practice

Verified in `TOOLING-AUDIT.md` §Phase 2, alongside the plugin and skill measurements. Summary: all six of your starting findings confirmed; nothing has replaced the AGENTS.md/CLAUDE.md convention; **no maintained tool exists** for agent-doc-map drift (the space is API-schema and Terraform; only Dosu does docs, commercial and at-scale) — so hand-roll it, ~180 lines on your existing Actions setup.

---

## Phase 3 — Design

### 3.1 Tier assignment

Rolled up by group, because 549 story files do not need 549 rows.

| Current path | New path | Tier | Why | Action |
|---|---|---|---|---|
| `CLAUDE.md` | `CLAUDE.md` | 1 | Claude's entry point; must not hold content | **rewrite** → 5-line pointer |
| `AGENTS.md` | `AGENTS.md` | 1 | The single source of truth for all agents | **rewrite** → see `AGENTS.md.draft` |
| `MEMORY.md` | `MEMORY.md` | 1 | 52 lines but ~3,300 tokens — paragraphs, not an index | **rewrite** → one-line pointers |
| `README.md` | `README.md` | — | Human onboarding, not agent context | **keep**, fix D5/D6 |
| `documentation/rules/{coding-standards,testing,observability,posthog-integration}.md` | `documentation/guides/` | 2 | Applies to a *kind* of work | **move** |
| `documentation/rules/mvp-requirements.md` | — | — | 418 lines, 2026-03-01, pre-v6, still `alwaysApply:true` in Cursor | **delete** |
| `documentation/rules/{tech-stack,project-context,best-practices,frontend-components}.md` | — | — | Duplicate AGENTS.md/README and disagree with both (D2) | **delete** |
| `documentation/application/{schema,*-api}.md` | `documentation/reference/{schema,api}.md` | 2 | 3,203 lines, 4+ months behind weekly code | **rewrite as generated** |
| `documentation/application/*-flow.md` | `documentation/reference/` | 3 | Deep reference, followed from a tier-2 node | **merge** (3 → 1) |
| `documentation/application/cicd.md` | `documentation/setup/` | 2 | Overlaps `backend-ecr-deploy.md` | **merge** |
| `documentation/architecture/**` | unchanged | 2/3 | Current-state design; session/ is the hot path | **keep**, retitle off "(v6)" |
| `documentation/architecture/reference/v2-vs-v3-delta-report.md` | — | — | 618 lines comparing two dead generations | **delete** |
| `documentation/decisions/DEC-*` | unchanged | 3 | Immutable rationale; never stale, only superseded | **keep** |
| `documentation/archive/ADR-001` | `documentation/decisions/` | 3 | Same kind of thing, arbitrarily separated | **move** |
| `documentation/flow/v7/**` | `documentation/product/` | 3 | The one live product spec | **move** |
| `documentation/flow/v1…v6` + 5 diff docs | — | — | **~65 files, ~34,000 lines** of superseded spec git already holds | **delete** |
| `documentation/prompts/onboarding-session-prompts/*` | — | — | 15 dated snapshots; authoritative copy is `prisma/seed/data/prompt-templates/` | **delete** |
| `documentation/prompts/{v8-modular,regular-session-prompts}` | `documentation/product/prompts/` | 3 | Live prompt design | **move** |
| `documentation/prompts/testing/**` | — | — | Untracked debug transcripts | **delete** (gitignore) |
| `documentation/audit/` + `audits/` | `documentation/audits/` | — | Two dirs, near-identical names (D8) | **merge** |
| `documentation/stories/**` (549 files) | unchanged | **none** | Frozen work log. Not documentation. | **keep, freeze, exclude** |
| `documentation/{research,design,setup}/` | unchanged | 2/3 | Small and current | **keep** |
| `documentation/resources/panya-*.md` | — | — | Superseded by `product/` | **delete** |
| `docs/superpowers/`, `.superpowers/` | — | — | Plugin removed (though **still installed** — see TOOLING-AUDIT) | **delete** |
| `random-commands.md` | — | — | 262 lines, unreferenced by anything | **delete** |
| `TODOS.md` | ? | — | Nothing declares when to read it | **ask** — OPEN-QUESTIONS Q5 |
| `app/**/README.md` (8) | unchanged | 3 | Per-module, reached from code | **keep** |
| `pnpm-lock.yaml` | — | — | Stale; CI uses npm (D9) | **delete** |

Net: **786 → ~700 files, 141,595 → ~100,000 lines**, and the number of docs an agent may treat as current truth drops from "all of them" to **13 mapped nodes**.

### 3.2 The Tier 1 file

`AGENTS.md.draft` — 60 lines, **~890 tokens**. `CLAUDE.md.draft` — 5 lines, ~60 tokens.

Combined Tier 1 goes from ~6,200 tokens to **~950**, and the ~950 is true.

The highest-value content is §Hard rules. Five of the twelve — `db:migrate` over `db:push`, `dotenv -o`, the two-Vite-configs constraint, Sentry-in-both-configs, story-ID claiming — currently exist **only** in `memory/` or a decision doc, and each is a rule an agent violates on a first attempt.

Note what is deliberately absent: no architecture section, no onboarding prose, no directory tree, no tech-stack list. Per your finding #4 and confirmed in Phase 2, that material changes agent behaviour very little and costs tokens on every task. `README.md` keeps it for humans.

### 3.3 The map file

`map.yaml.draft` — 13 nodes, filled in for this repo. YAML over JSON because `yaml` is already a dependency (`package.json`) and comments matter here: half the file's value is the field documentation at the top.

Two fields beyond your minimum:

- **`generated`** — the command that emits this doc. CI warns when a generated doc has a hand-written commit. This is the only durable fix for schema/API docs, which are your fastest drifters (§1.4).
- **`freshness`** — per-node max age in days. Global thresholds are wrong here: `schema.md` at 14 days and a design brief at 180 are both correct, and one number cannot be both.

### 3.4 Traversal rules

**`map.yaml` is never loaded into context.** It is CI config, like `eslint.config.js`. Two artefacts are generated from it, and those are the only things an agent sees:

| Artefact | Cost | When paid |
|---|---|---|
| doc-map table in `AGENTS.md` | ~200 tok | every message |
| **Related** footer in each tier-2/3 doc | ~30 tok | only if already reading that doc |
| `map.yaml` itself | **0** | never |

This matters because the expensive fields — `covers_code` globs, `verified_at`, `freshness`, `generated` — exist for the drift checker, not the agent. Keeping them out of context is the whole reason the map is a separate file rather than more rows in `AGENTS.md`.

The consequence for traversal is the design's one non-obvious move: **edges must be rendered into the docs, not looked up.** If `links` lived only in an unread YAML file there would be no graph — just a flat lookup table. So `npm run docs:map` writes a generated `Related` footer into each doc, and the agent traverses by following an ordinary markdown link it can see. `links:` in `map.yaml` becomes the *assertion* CI validates (check 6): the footer matches the declared graph, and every target resolves.

**Always-on cost is flat at ~200 tokens regardless of map size.** What scales is the table itself, at ~15 tokens per row — hence the hard 25-node ceiling documented in `map.yaml`. Past that, collapse siblings behind a parent node rather than adding rows; a 26th row should require deleting one, exactly like the 60-line `AGENTS.md` budget.

**At session start** an agent reads `CLAUDE.md` (5 lines) → `AGENTS.md` (59 lines). Nothing else. ~950 tokens.

**Choosing a tier-2 doc:** match the task against the doc-map table. The table's trigger words come from `map.yaml`'s `triggers`. One row matches, and the footer says read only that row.

**Following a `links` edge:** only when the tier-2 doc leaves a question unanswered that the linked node's `triggers` cover. Not speculatively. `links` is a permission, not a reading list.

**When to stop and ask:** if two rows match and they disagree; if the matched doc's `verified_at` is older than the last commit to its `covers_code` (the doc is admitting it is stale); if the task touches something in no node's `covers_code` at all — that last case means the map has a hole, and inventing an answer is how the map stays holed.

#### Worked examples

**A. "Add a `GET /api/me/streak` endpoint."**
Load: `AGENTS.md` (890) → `reference/api.md` §customer routes (~1,200) → link to `schema` for the model (~800). **≈ 2,900 tokens.**
Today: `CLAUDE.md` + `AGENTS.md` + `MEMORY.md` (6,200) then grep for a similar route, read 3–4 module files (~8,000), and probably miss the Clerk `userId`→`vendorId` rule because it lives in a global rules file. **≈ 14,000 tokens and a likely bug.**

**B. "Games are double-counting FSRS reviews."**
Load: `AGENTS.md` (890) → `architecture/engagement.md` (~1,500) → link to `session` for the post-session pipeline (~2,000). **≈ 4,400.**
Today: the answer is in `memory/project_s068_planning.md` ("games ALREADY write FSRS (S-042) — inter-session drift real today"), reachable only if the agent reads root `MEMORY.md` closely and follows the pointer. More likely it greps `documentation/flow/`, hits four generations of engagement-layer spec, and picks one. **≈ 20,000 tokens, and the wrong generation.**

**C. "Deploy is failing on the new env var."**
Load: `AGENTS.md` (890 — includes the `VITE_*`-is-build-time-inlined rule, which is very often the whole answer) → `setup/backend-ecr-deploy.md` (~2,000). **≈ 2,900.**
Today: `AGENTS.md:48-64` already covers this well — one of the few places current docs work. Saving is modest; correctness is unchanged.

Across the three: **~10,000 tokens vs ~40,000**, and two of three change the *answer*, not just the cost.

### 3.5 Freshness and drift control

1. **Same-PR rule** — exact wording is the final section of `AGENTS.md.draft`. The clause that matters is the last one: *if the doc is wrong and you cannot fix it in scope, delete the claim rather than leave it.* Without that, the rule quietly incentivises leaving stale text alone.
2. **CI drift check** — `drift-check.draft.ts` + `docs-drift.workflow.draft.yml`. Six checks. **It runs as its own workflow, not inside `ci.yml`**, because `ci.yml:5-8` carries `paths-ignore: ["documentation/**", "**/*.md"]` — adding the job there would mean it never runs on the doc half of the problem.
   **Would it have caught a Phase 1 finding?** Yes, several: `documentation/application/schema.md` (verified 2026-05-12, `prisma/schema.prisma` committed 2026-07-19) fails check 4; `README.md:189` fails check 3; `CLAUDE.md`'s `npm run deploy` fails check 2 once the retired scripts are removed from `package.json`.
3. **Scheduled staleness report** — weekly, Mondays 06:00 UTC, grouped by `owner`, filed as one recurring GitHub issue rather than a red cron job nobody looks at. Weekly because the same-PR rule is the primary defence and this is only the backstop; daily would train you to ignore it.
4. **Generation** — `reference/schema.md` (from `prisma/schema.prisma`) and `reference/api.md` (from `@rcmade/hono-docs`, already installed and scripted as `docs:generate`). These two replace ~3,200 hand-written lines that are your worst drifters. Error codes and config reference are candidates later; there is no single source for them today.

### 3.6 Cross-tool strategy

`AGENTS.md` is the only file with content. Everything else is a stub that names it:

- `CLAUDE.md` — 5-line pointer. Check 6 of the drift script **fails the build if it exceeds 10 non-blank lines**, which is precisely the "a script edits the alias while the real file goes stale" failure you asked about. It cannot regrow silently.
- `.cursor/rules/*.mdc` — already 6-line pointers into `documentation/`. Update the five that point at deleted rules files. This pattern is the best thing in the repo today; it is being kept, not replaced.
- No `.github/copilot-instructions.md` exists. Do not create one; if Copilot is adopted later, add a pointer, never a copy.

**No symlinks.** You raised the risk and it is real, but on this repo it is worse than you framed it: `CLAUDE.md` and `AGENTS.md` need genuinely different content (one is a pointer, one is the source), so a symlink cannot express the relationship at all. Two real files plus a CI size check is both simpler and more robust than a symlink plus a check that the symlink is still a symlink.

---

## Phase 4 — Migration

See `MIGRATION.md`. Ten steps, ~8 hours total, first useful result at **20 minutes** (Step 1: fix the four lies — no tooling, no structure, no review cycle).

Unresolved items are in `OPEN-QUESTIONS.md` — Q3 in particular (**which architecture docs are actually current?**) blocks shipping `map.yaml`, because a `verified_at` I invented would be worse than no map at all.
