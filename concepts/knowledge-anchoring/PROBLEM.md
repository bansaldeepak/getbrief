# Knowledge Anchoring — Problem Statement & Research

The single document defining what problem we're solving, why existing solutions don't work, what we've researched, and what a POC would prove.

**Status:** Problem aligned, architecture direction agreed.
**Date:** 2026-08-07
**Relates to:** [Agent Docs System ROADMAP](../agent-docs-system/ROADMAP.md) — Phase 8.7 (concept nodes), Phase 9b (section markers), D21 (domain concept nodes), D8 (context graph as join)

---

## The problem in one sentence

We write extensively (memory, TODOs, decisions, stories, rules) but the knowledge never reaches the moment it would prevent a mistake — because it's linked to files, not to the code symbols where the constraint actually lives.

## Five Whys

| # | Why | Finding |
|---|---|---|
| 1 | Why don't learnings reach the moment they'd help? | Surfacing is pull-based. Nothing pushes "you're about to touch X — here's what bit us" into context. |
| 2 | Why is it pull-based? | The connection between code and knowledge is *spatial* (file-path globs), not *semantic* (this function, this decision). 50 files match a glob — too broad to auto-surface. |
| 3 | Why spatial, not semantic? | The unit of documentation is the narrative document. Smallest addressable piece is a whole file. Can't point at one paragraph and say "this constrains `deriveObjectState`." |
| 4 | Why is the unit a narrative document? | System was designed for humans browsing folders, then retrofitted for machines. Machines don't browse — they query. |
| 5 | Why browsing, not querying? | Fundamental assumption: the reader navigates to knowledge. An LLM either has knowledge in context or it doesn't — there's no "navigation." |

**Root cause:** Documentation and code are two separate graphs with no precise edges between them. Code has AST-level structure; docs have narrative structure; the link between them is a file glob — the loosest possible coupling.

## What this costs us (evidence)

1. **TODO-020** (mastery state split-brain) filed 2026-06-12. When S-087 touches session content two months later, nothing surfaces it. Developer must remember to check TODOS.md.
2. **D22** found the sanctioned memory store *never loaded into context at all*. The wrong store loaded.
3. **Retro skill writes to `memory/`**, but `/discover` and `/prd` don't query it for "what bit us in this area."
4. **Stories are "never read for how things work today"** — so gotchas in `summary.md` are write-only.
5. **`covers_code` globs proved too coarse** — D26 found five dead globs, D28 found one node claiming 63% of all commits while only 25% were relevant.

Pattern: Write → file → forget → repeat mistake → discover the learning existed.

## What we want

```
Developer starts work on module X
→ System automatically says:
  "You're touching X. Here's what matters:
   - TODO-021: synthetic IDs not yet resolved
   - CONSTRAINT: forward-only mastery ratchet (TODO-026)
   - STYLE: sub-module pattern, avatar-routes naming
   - TRAP: CarryForwardNote references rot when TODO-006 lands"
→ Developer plans correctly from day one
```

This must work:
- **At planning time** (`/discover`, `/prd`, `/trd`) — "what does the system know about this area?"
- **At implementation time** (file opened) — "this function has constraints attached"
- **At CI time** (symbol changed) — "you changed X, these knowledge anchors reference it — verify"
- **For any agent/model** — not Claude-specific; standard format any tool can read

## Design principles

1. **Anchors live in code** — TSDoc-style tags referencing decision/TODO/constraint IDs. Moves with the code during refactoring.
2. **Detail lives with the code it describes** — module-level docs (flowcharts, sequence diagrams, state machines) live inside the module directory, not in a separate `documentation/architecture/` tree. Architecture docs become a high-level map that *points to* module docs, not a parallel copy.
3. **Auto-generation for everything derivable** — TypeDoc for API docs, hono-openapi for route docs, codegraph for the symbol graph.
4. **Concise over comprehensive** — a one-line `@constraint TODO-020` tag beats a paragraph that nobody reads.
5. **Staleness is detectable** — if an anchored symbol changes, the system can flag "verify the constraint still holds."
6. **Colocated over centralized** — documentation that describes one module lives in that module. Documentation that describes the system lives in `documentation/`. The test: "if I delete this module, should this doc go with it?" If yes, it belongs in the module.

### Colocated documentation structure

```
app/server/modules/<module>/
  README.md         ← entry point: purpose, contracts, key files, design decisions
  docs/             ← diagrams, flows, state machines specific to this module
    lifecycle.md
    sequence.md

documentation/
  architecture/
    README.md       ← system-level overview, one paragraph per domain → points to module docs
    session.md      ← summary + "for details: app/server/modules/session/docs/"
  reference/        ← generated (schema.md, api.md)
  rules/            ← conventions that apply across modules
  decisions/        ← system-wide decisions (not module-specific ones — those go in module README)
```

**What moves where:**
| Today | Moves to | Why |
|---|---|---|
| `documentation/architecture/session/05-live-session.md` | `app/server/modules/session/docs/live-session.md` | Describes one module's internals |
| `documentation/architecture/session/README.md` | `documentation/architecture/session.md` (one-pager) | Becomes a pointer, not a library |
| `documentation/architecture/README.md` | Stays | System-level overview |
| Module README (already exists) | Stays, becomes richer | Already the right location |

**Evidence this is natural:** The session module README is already 120 lines with auth models, runtime clock contracts, and design decisions. It grew there because that's where developers look. The `documentation/architecture/session/` directory has 10 files that describe the same domain — and `docs:drift` can't detect when they diverge from the code because they're linked by glob, not by proximity.

## Research: what exists

### Tools evaluated

| Tool | Links docs to code at | Staleness detection | Handles "why" | TS support |
|---|---|---|---|---|
| **Swimm** | AI-extracted snippets | LLM validator | Claims to | Yes |
| **API Extractor** (MS) | TypeScript AST → report | Diff report in CI | No — sigs only | Native |
| **TypeDoc** | TSDoc ↔ symbol | Regenerate; no drift | No | Native |
| **Rust `///` + rustdoc** | Compiler-linked | Build fails on removal | No | N/A |
| **Graphify** | AST nodes | Graph diff | No — structure | Yes |
| **lat.md** | Wiki-links + `@lat` comments | Semantic search | Partial | Yes |
| **Our `map.yaml` + `docs:sync`** | File-path globs | Commit-date comparison | Yes | Yes |

### Key gap across all tooling

No tool links *rationale* (why, constraints, traps) to code at symbol granularity. Everything is either API-reference ("what") or narrative docs (disconnected from code).

### CodeGraph (already installed, v0.6.8 → latest 1.5.0)

**What it gives us:**
- 10,511 nodes, 13,443 edges in a SQLite DB
- Call graph, import graph, symbol search, impact analysis
- MCP-queryable — any AI agent can use it
- MIT licensed, extensible schema

**SQLite schema (key tables):**
```
nodes(id, kind, name, qualified_name, file_path, start_line, end_line, docstring, signature, ...)
edges(source, target, kind, metadata JSON, line, col, provenance)
files(path, content_hash, language, size, node_count)
vectors(node_id, embedding BLOB, model)  -- semantic search ready
```

**What it doesn't have:**
- No custom metadata on nodes (no "this function has TODO-020")
- No annotation/knowledge layer
- No plugin system

**What we can do:**
1. Add a sibling SQLite table (`knowledge_anchors`) keyed by `node_id` — zero changes to codegraph itself
2. Or use TSDoc `@constraint`/`@decision` tags that codegraph already extracts into `docstring`
3. Or both: inline tag is the source of truth, a build step extracts them into a queryable index

### The hybrid model

| Layer | What | Where | Moves with code? |
|---|---|---|---|
| **Inline anchor** | `@constraint TODO-020` in TSDoc | Source file | Yes (refactoring carries it) |
| **Knowledge index** | Extracted anchors → queryable store | `.codegraph/` or `documentation/knowledge.yaml` | Regenerated |
| **Detail** | Full explanation of the constraint | `TODOS.md`, `decisions/`, `memory/` | Separate file, keyed by ID |
| **Query layer** | "What do I need to know about X?" | MCP tool or `npm run` script | Reads index + detail |

## Relationship to existing ROADMAP

| ROADMAP item | Relationship |
|---|---|
| **Phase 8.7 — Concept nodes** | Concept nodes are the *domain-level* anchor (Session, Avatar, User). Knowledge anchoring is the *symbol-level* anchor. Complementary, not conflicting. |
| **Phase 9b — Section markers** | Section markers (`<!-- MODULE:x:START/END -->`) solve "which paragraph describes which code." Knowledge anchors solve "which symbol carries which constraint." Same problem, different granularity. |
| **D21 — Domain concepts** | D21's `concept` nodes bridge schema ↔ code ↔ docs at domain level. Knowledge anchors bridge decisions/traps ↔ specific functions. D21 is the coarse graph; this is the fine graph. |
| **D8 — Context graph as join** | D8 says "no new database, join existing stores on story ID." Knowledge anchoring adds a second join key: symbol ID. Same philosophy (join, don't duplicate), finer grain. |

## Proposed architecture

### Two databases, one MCP server

```
.project/knowledge.db          ← in git, small (~200KB), the structured truth
.project/schema.sql            ← in git, rebuild from scratch if needed
.codegraph/codegraph.db        ← in .gitignore, large (20MB), regenerated locally

MCP server (local, any agent connects)
  ├── reads .project/knowledge.db   (state, decisions, constraints, memory)
  ├── reads .codegraph/codegraph.db (symbols, call graph, impact)
  └── joins them: "symbol X has constraints Y, Z attached"
```

### What lives in `knowledge.db` (structured, queryable)

| Table | Replaces | What it holds |
|---|---|---|
| `epics` | PRD/TRD grouping | id, title, status, doc_path (PRD, TRD live as prose) |
| `stories` | PROJECT-TRACKER.md rows | id, epic_id, title, status, feature, branch, PR, created_at |
| `tasks` | tasks/index.md status rows | id, story_id, title, status, commit_sha |
| `todos` | TODOS.md entries | id, title, priority, status, depends_on, anchors[] |
| `decisions` | scattered DEC-NNN files | id, title, status, date, supersedes, doc_path |
| `constraints` | memory/feedback_* | id, summary, type (trap/pattern/correction), learned_from |
| `anchors` | (new) | knowledge_id, knowledge_type → codegraph node_id |
| `retro_findings` | buried in story summary.md | id, story_id, type, summary, promoted_to |
| `memory` | MEMORY.md + memory/*.md | id, type, summary, detail, related_symbols[] |

### Work hierarchy

```
Epic (PRD + TRD scope — may span multiple stories)
  └── Story (one shippable unit — one branch, one PR)
       └── Task (one commit — atomic unit of work)
```

An epic owns the PRD and TRD. Stories under it inherit that context. When planning starts, the epic is created first; stories are carved from it. This matches how we already work (`documentation/stories/<feature>/` groups PRD, TRD, and multiple S-NNN folders) — the DB just makes the hierarchy queryable.

### What stays as markdown (prose, not queryable)

| What | Why it stays |
|---|---|
| PRD, TRD, story.md | Narrative — too rich for a DB column |
| Architecture docs | Explanation, diagrams, flows |
| Rules (documentation/rules/) | Loaded by agents via `.claude/rules/` path-scoping |
| Decisions (full text) | DB holds the index + status; file holds the reasoning |

### The relationship between DB and prose

The DB holds `story.id = "S-087"` with status, tasks, links, anchors. It has a `doc_path` pointing to `documentation/stories/session-content/S-087/story.md` for the full narrative. The prose still exists — but *state*, *links*, and *constraints* live in the DB where tools query them without parsing markdown.

### SQLite schema sketch

```sql
-- Core project state
CREATE TABLE epics (
    id TEXT PRIMARY KEY,              -- E-001 or feature slug
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned',  -- planned|in-progress|completed|dropped
    feature TEXT NOT NULL,            -- session-content, image-pipeline-determinism
    prd_path TEXT,                    -- documentation/stories/<feature>/PRD.md
    trd_path TEXT,                    -- documentation/stories/<feature>/TRD.md
    created_at INTEGER NOT NULL,
    completed_at INTEGER
);

CREATE TABLE stories (
    id TEXT PRIMARY KEY,              -- S-087
    epic_id TEXT REFERENCES epics(id),
    title TEXT NOT NULL,
    feature TEXT,                      -- session-content
    status TEXT NOT NULL DEFAULT 'planned',  -- planned|in-progress|completed|dropped
    branch TEXT,
    pr_number INTEGER,
    doc_path TEXT,                     -- documentation/stories/.../story.md
    created_at INTEGER NOT NULL,
    completed_at INTEGER
);

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,              -- S-087-T1
    story_id TEXT NOT NULL REFERENCES stories(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending|in-progress|done|dropped
    commit_sha TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE todos (
    id TEXT PRIMARY KEY,              -- TODO-020
    title TEXT NOT NULL,
    priority TEXT,                     -- P1|P2|P3
    status TEXT NOT NULL DEFAULT 'open',  -- open|in-progress|done|moot|obsolete
    source TEXT,                       -- "CEO Review (2026-06-12)"
    depends_on TEXT,                   -- JSON array of IDs
    doc_path TEXT,                     -- optional link to full description
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
);

CREATE TABLE decisions (
    id TEXT PRIMARY KEY,              -- DEC-001
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',  -- active|superseded|reversed
    superseded_by TEXT,
    doc_path TEXT,                     -- documentation/decisions/DEC-001-...md
    created_at INTEGER NOT NULL
);

CREATE TABLE constraints (
    id TEXT PRIMARY KEY,              -- auto-generated or manual
    summary TEXT NOT NULL,            -- one line: "forward-only mastery ratchet"
    type TEXT NOT NULL,               -- trap|pattern|correction|style
    learned_from TEXT,                -- story ID or retro that produced it
    detail TEXT,                      -- longer explanation if needed
    created_at INTEGER NOT NULL
);

CREATE TABLE retro_findings (
    id TEXT PRIMARY KEY,
    story_id TEXT REFERENCES stories(id),
    type TEXT NOT NULL,               -- trap|pattern|correction|praise
    summary TEXT NOT NULL,
    promoted_to TEXT,                 -- constraint ID or rule path if graduated
    created_at INTEGER NOT NULL
);

CREATE TABLE memory (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,               -- user|feedback|project|reference
    summary TEXT NOT NULL,
    detail TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER                -- NULL = permanent
);

-- The join: knowledge → code symbols
CREATE TABLE anchors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_type TEXT NOT NULL,     -- todo|decision|constraint|memory
    knowledge_id TEXT NOT NULL,       -- TODO-020, DEC-001, etc.
    symbol_id TEXT,                   -- codegraph node_id (nullable for non-TS)
    symbol_name TEXT NOT NULL,        -- human-readable: "deriveObjectState"
    file_path TEXT NOT NULL,          -- where the anchor lives
    line INTEGER,                     -- source line of the @constraint tag
    created_at INTEGER NOT NULL
);

CREATE INDEX idx_anchors_symbol ON anchors(symbol_id);
CREATE INDEX idx_anchors_knowledge ON anchors(knowledge_type, knowledge_id);
CREATE INDEX idx_anchors_file ON anchors(file_path);
```

### How it gets queried

**At implementation time (file-level):**
```
Agent: "I'm about to work on app/server/services/tutor-engine/state-derivation.ts"

MCP query flow:
1. codegraph: file → symbols [deriveObjectState, STATE_THRESHOLDS, deriveOverallLevel]
2. knowledge.db: anchors WHERE symbol_name IN (...) → knowledge IDs
3. knowledge.db: fetch the referenced TODOs, constraints, decisions
4. Return: "TODO-020 (open, P2): mastery derivation split-brain.
            TODO-026 (open, P3): state never regresses while stability collapses.
            CONSTRAINT: forward-only ratchet is deliberate — decide if high-water-mark or current-truth."
```

**At planning time (epic/feature-level):**
```
Agent: "/discover session-content"

MCP query flow:
1. knowledge.db: epics WHERE feature = 'session-content' → E-001
2. knowledge.db: stories WHERE epic_id = 'E-001' → [S-087, S-091, ...] with statuses
3. knowledge.db: todos WHERE depends_on includes stories in this epic → open blockers
4. knowledge.db: retro_findings WHERE story_id IN (...) → traps from prior work in this area
5. knowledge.db: constraints anchored to symbols in session modules → active constraints
6. Return: "Epic: session-content (in-progress, 2 of 4 stories done).
            BLOCKER: TODO-021 (synthetic IDs) blocks image display in Session 1.
            TRAP (from S-086 retro): transport can terminate session — TODO-025.
            PRD: documentation/stories/session-content/PRD.md
            TRD: documentation/stories/session-content/TRD.md"
```

### Implementation notes

- **No timestamps in code.** Git is the timestamp. `git log --follow -1` on a function gives real last-modified.
- **TSDoc is the anchor source.** `@constraint TODO-020` in the docstring is what the extractor reads. CodeGraph already stores `docstring` on every node — a regex over that field finds all anchors without any schema change to codegraph.
- **The DB is tiny and in git.** Project metadata for even a large project is <1MB. Binary diffs in git are fine at that size.
- **Migration path:** A script reads existing TODOS.md, PROJECT-TRACKER.md, memory/*.md and seeds the DB. Then the markdown files can be deleted or kept as read-only legacy. No big-bang — parallel run first.
- **HTML viewer:** A static page that reads the DB via sql.js (WASM SQLite). Filters by status, feature, priority. No server needed.
- **Later: memory moves here too.** `memory/` entries become rows in the `memory` table. The MCP server surfaces them the same way — by symbol proximity, not by hoping someone reads the index.

## POC scope (proposed)

**Goal:** Prove that a SQLite knowledge store + CodeGraph symbol lookup surfaces the right information at planning time.

**Scope:** Seed the DB from existing data, anchor 5–10 key functions, query by file path, verify it returns what a developer needed.

### Phase 1 — The store (day 1)

1. ✅ Upgrade codegraph to 1.5.0
2. Create `.project/schema.sql` and `.project/knowledge.db`
3. Write a seed script that migrates existing `TODOS.md` entries → `todos` table
4. Manually add 5–10 anchors for the `session/` module (TODO-020 → `deriveObjectState`, etc.)

### Phase 2 — The query (day 2)

5. Write `npm run knowledge:context <file-or-dir>` — given a path:
   - Query codegraph for symbols in that path
   - Query `anchors` table for matching symbol names
   - Fetch the referenced knowledge (todo, constraint, decision)
   - Print a concise summary
6. Test: run against `app/server/services/tutor-engine/state-derivation.ts` — does it surface TODO-020 and TODO-026?

### Phase 3 — Validate (day 3)

7. Replay S-087's changed file list. Does the tool surface TODO-020, TODO-021, TODO-016?
8. Try from a planning context: "I'm about to work on session content" → does it tell me what matters?
9. Evaluate: is the output useful or noisy? Too much? Too little?

### What POC does NOT do

- No MCP server yet (just a CLI script)
- No migration of stories/tracker (manual seed of a few TODOs only)
- No CI integration
- No HTML viewer
- No auto-extraction from TSDoc (manual anchor entries in DB)
- No changes to existing docs — parallel run

### Success criteria

Running `npm run knowledge:context app/server/modules/session/` surfaces at least 3 relevant constraints that S-087's developer would otherwise have had to remember or discover manually. If yes → proceed to full migration plan. If no → revisit whether the join (symbol → knowledge) is the right abstraction.

---

## Open questions

1. **Tag syntax:** `@constraint TODO-020` vs `@see TODO-020` vs `@link TODO-020`? TSDoc has `@see` and `@link` built in — custom block tags (`@constraint`) require a `tsdoc.json` config.
2. **Density:** How many anchors per function before it becomes noise? Rule of thumb needed.
3. **Graduation:** When a TODO is resolved, what happens to the anchor? Auto-strip? Convert to `@decision`?
4. **Non-TS files:** Prisma schema, config files, YAML — how do constraints attach there?
5. **CodeGraph 1.5.0:** Does the new version add any annotation/metadata features that change the approach?
