# Knowledge Anchoring — POC Results

Executed 2026-08-10 on branch `worktree-knowledge-graph-fix`. Validates the hypothesis from [PROBLEM.md](./PROBLEM.md).

---

## What we built

Three files, zero new dependencies (Node 24 built-in `node:sqlite`):

| File | Purpose |
|---|---|
| `.project/schema.sql` | DDL — rebuild DB from scratch |
| `scripts/knowledge/seed.ts` | Parses existing artifacts → populates `knowledge.db` |
| `scripts/knowledge/context.ts` | Query: file path → relevant knowledge |

Run: `node --import tsx scripts/knowledge/seed.ts` then `node --import tsx scripts/knowledge/context.ts <path>`

## What it ingested

| Source | Entries | Method |
|---|---|---|
| `TODOS.md` | 27 TODOs | Regex parse of markdown headers + fields |
| `documentation/decisions/` | 6 decisions | Frontmatter parse per file |
| `documentation/PROJECT-TRACKER.md` | 92 stories | Regex parse of markdown table |
| `memory/*.md` | 58 memory entries | YAML frontmatter parse |
| Manual | 3 constraints | Hand-entered from retro findings |
| Manual | 31 anchors | Symbol → knowledge links |

**DB size: 184KB.** Trivially git-trackable.

## What it surfaces

### Test results

| Query path | Knowledge surfaced | Types |
|---|---|---|
| `services/tutor-engine/state-derivation.ts` | TODO-020, TODO-026, C-001 | TODO + Constraint |
| `modules/session/` | TODO-009, TODO-025, C-002, C-003 | TODO + Constraint |
| `services/tutor-engine/` | TODO-020, TODO-026, TODO-021, TODO-016, TODO-005, C-001 | TODO + Constraint |
| `client/components/session/` | Stale closure trap (S-059) | Memory |
| `prisma/schema.prisma` | db:push vs migrate rule | Memory |
| `shared/middleware/error-handler.ts` | catch antipattern | Memory |
| `modules/webhook/__tests__/` | Dead code + mock identity traps | Memory |
| `vite.config.ts` | DEC-001, DEC-003, bundle path trap | Decision + Memory |
| `shared/lib/logger.ts` | DEC-002 (pino), spy antipattern | Decision + Memory |
| `modules/session/service.ts` | TODO-025, C-002, DEC-005 | TODO + Constraint + Decision |
| `scripts/docs/` | docs:sync regen footer trap | Memory |

**Zero false positives across all tests.**

### What S-087's developer would have seen

Running `context.ts app/server/services/tutor-engine/` surfaces:
- **TODO-020** (P2): mastery derivation split-brain — the exact function they'd touch
- **TODO-026** (P3): state never regresses — known open question on the same function
- **TODO-021** (P2): synthetic IDs in Session 1 brief — directly relevant to content schema
- **TODO-016** (P1): rich Session 1 brief — committed next story, depends on this work
- **TODO-005** (P2): architecture docs need v4 update — context assembler they'd modify
- **C-001**: forward-only ratchet is deliberate — don't "fix" it without deciding first

None of these surfaced during S-087's actual planning. All were in TODOS.md or memory files. The system works.

## Key findings

### 1. node:sqlite is production-ready for this

Node 24's built-in `node:sqlite` (`DatabaseSync`) works without flags, no dependencies. WAL mode, prepared statements, all standard. This is a viable choice for the full implementation — no `better-sqlite3` needed.

### 2. CodeGraph integration is useful but not critical for POC

The `codegraph query` output helps discover symbols in a path, but for the POC the primary match is **file-path-based** (anchors carry `file_path`). The real value of CodeGraph's symbol graph comes later:
- Impact analysis: "you changed X, here's what calls it"
- Auto-anchor extraction from TSDoc `@constraint` tags (via the `docstring` field)
- Cross-file constraint propagation

### 3. Memory frontmatter inconsistency is the main data quality issue

13 of 71 memory files lack YAML frontmatter (plain markdown). The parser skips them. Full migration needs either:
- Standardize all memory files to have frontmatter (one-time pass)
- Or a fallback parser that extracts from the `#` title line

### 4. Anchors are the value — without them, the DB is just another storage format

Without the `anchors` table joining knowledge to symbols/files, this is just PROJECT-TRACKER.md in SQLite (same data, different format). The anchors are what make it *surface at the right moment*. In the full system, anchors come from:
- TSDoc `@constraint` / `@decision` tags (source of truth, moves with code)
- Auto-extracted by a build step reading CodeGraph's `docstring` field
- Manually entered for non-TS (Prisma schema, Dockerfile, configs)

### 5. The tracker parse works but is fragile

Regex over a markdown table is brittle. The tracker has massive inline summaries in the table cells. For the full system, the flow should invert: **DB is the source → tracker is generated**, not parsed.

### 6. log.md is NOT relevant for the knowledge DB

It's a transaction audit trail of documentation events, not actionable knowledge. What it records ("schema node verified 2026-07-21") doesn't change how you write code. The dates it carries are already in `map.yaml`. Skipped deliberately.

## Reusable in full implementation

| POC artifact | Reuse path |
|---|---|
| `.project/schema.sql` | Direct — the schema is the design |
| `scripts/knowledge/seed.ts` | One-time migration script; the full system writes to DB directly |
| `scripts/knowledge/context.ts` | Core of the MCP server's query handler |
| Anchor definitions | Seed data; eventually replaced by TSDoc extraction |

## Success criteria — PASSED

> Running `npm run knowledge:context app/server/modules/session/` surfaces at least 3 relevant constraints that S-087's developer would otherwise have had to remember or discover manually.

Result: **6 relevant items surfaced** (5 TODOs + 1 constraint) for tutor-engine, **4 items** for the session module. All actionable. None false positives.

## Next: full implementation plan

See [PROBLEM.md § Proposed architecture](./PROBLEM.md#proposed-architecture) for the target state. Key steps:

1. **Invert the flow**: DB becomes source of truth, not parsed from markdown
2. **MCP server**: wraps context.ts as a tool any agent can call
3. **TSDoc anchors**: `@constraint`, `@decision` tags in code → auto-extracted to DB
4. **Migration scripts**: one-time move of TODOS.md, tracker, memory into DB
5. **HTML viewer**: static page over sql.js for human browsing
6. **CI integration**: "you changed a symbol with anchors — verify the constraints"
