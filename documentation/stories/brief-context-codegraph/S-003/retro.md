# S-003 Retrospective

**Date**: 2026-08-21
**Story**: Bundle Codegraph + Unified Context Command
**Duration**: 2026-08-20 → 2026-08-21

## Scope Accuracy
- **Planned tasks**: 7
- **Actual tasks**: 7 + 3 post-review commits (enriched query, cap removal, review fixes)
- **Scope change**: Added `--full` explore mode and removed serve.mjs (both emerged from testing)

## What Went Well
- JS API approach validated — `searchNodes`, `getCallers`, `getCallees`, `getOutgoingEdges` all work as expected
- mtime-based caching is simple and correct — no stale reads in testing
- node:test infrastructure zero-config, fast (<3s for 34 tests)
- Live testing against taiboli-app immediately surfaced the gap between brief query and codegraph explore
- PR review caught real issues (shell injection, YAML injection) that would have shipped

## What Didn't Go Well
- Initial query output was too thin — base didn't show callees, and display was capped at 10. Agent would have gotten incomplete context. Caught only because user ran it manually.
- serve.mjs was dead code from the start — the knowledge MCP server was never running (binary not found). Should have been caught during planning.
- `getCallers` API shape assumption was wrong (returns `[{node, edge}]` not flat nodes) — cost a debugging round
- `args[0]` bug in cli routing (command name vs first arg) — classic off-by-one, cost another round

## Learnings
| # | Learning | Action Taken |
|---|---------|-------------|
| 1 | Always test CLI output from user perspective before shipping — agent-facing tools need complete data | Updated query to show all results uncapped |
| 2 | codegraph JS API returns wrapped objects (`{node, edge}`) not flat — verify shape before building on it | Documented in code-index.mjs patterns |
| 3 | `execSync` with template literals is a shell injection vector — always use `execFileSync` with args array | Fixed in init.mjs |
| 4 | String interpolation into YAML frontmatter is injection — use a serializer | Fixed with yaml.stringify |
| 5 | JSX event handlers (`onSubmit={fn}`) are invisible to codegraph — it only tracks explicit call edges | Known limitation, not fixable from our side |
| 6 | Dead MCP servers should be pruned during planning, not discovered during review | Removed serve.mjs |

## System Improvements Made
- `rules/brief.md` updated with `--full` documentation so models know the explore-level command exists
- `rules/codegraph.md` deleted — brief owns all code search now
- Provider configs cleaned — no more CODEGRAPH_START/END sections

## Recommendations for Next Story
- When wrapping a third-party API, write a spike script that exercises every method and logs return shapes BEFORE building the interface layer
- Test CLI tools from the user's terminal early — don't wait for the PR review phase
- If an MCP server isn't in active use (binary not found, no configured projects), remove it in planning not implementation
