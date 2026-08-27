# Migration plan

Ten steps. Each is independently shippable. Stop after any one and you are better off than today.

Ordered by **value per minute**, not by architectural tidiness — the truth-fixes come before the structure work, because a wrong `AGENTS.md:3` costs you on every task and a messy folder tree costs you almost nothing.

---

## Step 1 — Fix the four lies. **20 minutes.**

One commit, no new files, no structure change.

| File | Change |
|---|---|
| `AGENTS.md:3` | "single Cloudflare Worker" → Node.js Docker on AWS ECS (DEC-001) |
| `AGENTS.md:7` | drop `app/worker/app.ts` |
| `AGENTS.md:9` | fix module list: remove `websocket`, add `avatar, consent, engagement, enrollment, game, simulate, syllabus` |
| `MEMORY.md:8` | same runtime correction |
| `CLAUDE.md:27` | delete the `npm run deploy` row, replace with "push the branch" |
| `CLAUDE.md:10` | delete the `dev:server` row |
| `CLAUDE.md:12` | typecheck → the command CI actually runs |
| `README.md:189-192`, `:126` | delete links to the four non-existent root docs |

**If you stop here:** the two always-loaded files no longer describe a runtime you retired six weeks ago, and no agent will run a Cloudflare deploy. This is the single highest-value change in the whole proposal and it needs no system, no tooling and no review cycle.

## Step 2 — Delete what is provably dead. **30 minutes.**

`git rm -r` (recoverable from history, invisible to grep):

- `documentation/flow/v1 … v6` and the five inter-version diff docs → **~65 files, ~34,000 lines**
- `documentation/prompts/onboarding-session-prompts/` dated snapshots → 15 files, ~5,000 lines
- `docs/superpowers/` and `.superpowers/` (uninstall the plugin first, or they return)
- `documentation/audit/` → merge the 7 files into `documentation/audits/`, delete the singular dir
- `pnpm-lock.yaml`
- `random-commands.md` (262 lines, unreferenced)

**If you stop here:** documentation drops from 786 files to ~700 and from 141,595 lines to ~100,000. Grepping "universal core" returns one answer instead of six.

## Step 3 — Shrink `CLAUDE.md` to a pointer. **10 minutes.**

Move the (now-corrected) command table into `AGENTS.md`; replace `CLAUDE.md` with `CLAUDE.md.draft`. **Do not symlink** — see PROPOSAL.md §3.6.

**If you stop here:** one source of truth for commands. `.cursor/*.mdc` already works this way; Claude now matches.

## Step 4 — Ship the new `AGENTS.md`. **30 minutes.**

Paste `AGENTS.md.draft`. Its value is the twelve hard rules in §Hard rules — five of which (`db:migrate`, `dotenv -o`, the two Vite configs, Sentry-in-both-configs, story-ID claiming) currently exist **only** in `memory/` and are violated by default on a first attempt.

The doc-map table will point at three paths that do not exist yet (`reference/schema.md`, `reference/api.md`, `architecture/engagement.md`). That is fine and intentional — Step 6 creates them. Until then those rows point nowhere, which is no worse than today.

**If you stop here:** the rules that actually bite are loaded on every task instead of hidden in memory files.

## Step 5 — Reorganise `documentation/`. **1 hour.**

```
documentation/
  map.yaml              new
  PROJECT-TRACKER.md    unchanged
  guides/               ← rules/ (keep 4: coding-standards, testing, observability, posthog-integration)
  reference/            ← application/ (schema + api, both to become generated)
  architecture/         unchanged, retitled off "(v6)"
  decisions/            + ADR-001 moved in from archive/
  product/              ← flow/v7 only
  setup/                unchanged
  research/ design/ audits/   unchanged
  stories/              frozen
```

Deletes with this move: `rules/mvp-requirements.md` (418 lines, 2026-03-01, still `alwaysApply: true` in Cursor — actively harmful), `rules/tech-stack.md`, `rules/project-context.md`, `rules/best-practices.md`, `rules/frontend-components.md`. Update the five `.cursor/*.mdc` stubs to match.

**If you stop here:** the tree matches the tiers, and Cursor stops always-loading a pre-v6 MVP scope doc.

## Step 6 — Generate the two docs that drift fastest. **2 hours.**

`reference/schema.md` and `reference/api.md` become build artefacts, not prose. Together they replace ~3,200 hand-written lines that are 4+ months behind weekly-changing code.

- API: `npm run docs:generate` already exists (`@rcmade/hono-docs`) — wire its output to `reference/api.md`.
- Schema: new `npm run docs:schema` reading `prisma/schema.prisma`.

**If you stop here:** the two worst offenders can no longer go stale, because nobody writes them.

## Step 7 — Add `map.yaml`. **30 minutes.**

Paste `map.yaml.draft`. Inert on its own — it only becomes load-bearing at Step 8.

## Step 8 — Add the drift check. **1 hour.**

`scripts/ci/docs-drift.ts` + `.github/workflows/docs-drift.yml` + `"docs:drift"` in `package.json`.

**Expect it to fail on the first run, and let it.** Against today's repo it would flag `documentation/application/schema.md` (verified 2026-05-12, `prisma/schema.prisma` committed 2026-07-19) — one of the exact stale docs from Phase 1 §1.5. That failure is the check proving itself. Fix by regenerating (Step 6) and bumping `verified_at`.

**If you stop here:** you have the whole system. Steps 9–10 are polish.

## Step 9 — Generate the two projections. **2 hours.**

`npm run docs:map` writes both artefacts an agent actually reads, from `map.yaml`:

1. the doc-map table in `AGENTS.md`, between `<!-- MAP:START -->` / `<!-- MAP:END -->`
2. a **Related** footer in each tier-2/3 doc, between `<!-- LINKS:START -->` / `<!-- LINKS:END -->`, rendered from that node's `links`

CI fails if regenerating produces a diff (drift check 6). **Item 2 is not optional polish** — `map.yaml` is never loaded into context, so without rendered footers the `links` graph is unreachable and there is no traversal at all, only single-doc lookup. Until this step ships, an agent can find its entry doc but cannot walk an edge from it.

## Step 10 — Compact `MEMORY.md`. **45 minutes.**

52 lines but ~3,300 tokens, because entries are 300-word paragraphs. Convert each to a one-line pointer into `memory/`; the prose moves into the file it points at. ~4× reduction, nothing lost.

---

## Sequencing notes

- **Steps 1 and 2 are independent of everything.** Do them today whatever you decide about the rest.
- **Step 6 must precede Step 8**, or the drift check fails permanently on docs you have not yet automated — and a permanently-red check gets ignored, which is worse than no check.
- **Uninstall superpowers before Step 2**, or `.superpowers/` regenerates.
- Total: ~8 hours across ten sittings. First useful result at 20 minutes.
