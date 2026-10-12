---
id: RES-001
title: "Bundle codegraph into brief setup + unified context command"
status: open
priority: P1
created: 2026-08-20
_brief:
  version: 1
  record_id: 72da1637-9ff3-4931-bf0d-15d7b5684539
  item:
    id: RES-001
    type: research
    title: Bundle codegraph into brief setup + unified context command
    status: open
    link: null
    pr: null
---

# RES-001: Bundle codegraph + brief context

## Problem

Agents lack a unified context layer. They search text (brief) or code (codegraph) separately, often
using the wrong tool. `brief search "createClerkChildUser"` was used to find code — wrong tool.

## Opportunity

1. Bundle `@colbymchenry/codegraph` into our setup — `brief init` also runs codegraph init
2. Add `brief context graduate` — skills decide what's important, brief structures it into feature folders
3. Unified query: `brief context <query>` searches both AST (codegraph) and docs (brief)

## Design Direction

- **Skills own the intelligence** — they decide what context matters, what to graduate
- **brief owns the structure** — `brief context graduate` writes to feature folders with IDs
- **Codegraph owns the AST** — symbol lookup, callers, impact analysis
- **brief context** = query layer over both systems

This means:
- Fewer rules needed (codegraph rule absorbed into brief)
- Skills call `brief context graduate` instead of manually writing files
- Agents get one entry point for all context

## Codegraph Integration Plan

- Install `@colbymchenry/codegraph` as dependency or bundled tool
- `brief init` runs codegraph init if not already indexed
- `.codegraph/` stays gitignored (regenerated per machine, index is local)
- Remove standalone codegraph rule — brief rule covers it
- MCP tools still work (codegraph_explore etc.) — just setup is automated

## Open Questions

- Import library directly vs shell out to CLI?
- Incremental index updates or full rebuild only?
- Does codegraph handle monorepos (multiple entry points)?

## Experiment: Test Install

**Goal**: Verify codegraph npm package works reliably on our projects.

**Steps**:
1. Install `@colbymchenry/codegraph` globally
2. Run `codegraph init -i` on this repo (~/.agents)
3. Run `codegraph init -i` on taiboli-app
4. Exercise: search, callers, callees, context, impact
5. Compare quality vs manual grep

**Status**: Running (2026-08-20)
