# S-003: Bundle Codegraph + Unified Context Command -- Summary

## What Changed
<Updated after each task is completed>

## Decisions Made
- JS API for queries (36x faster than CLI), bundled CLI for init only (no JS init API)
- Bin resolved via `import.meta.url` from `lib/` (one level up to `brief/node_modules/.bin/`)
- `brief search` unchanged (doc-only); `brief query` is the NEW unified command
- Context stored at `documentation/context/` (cross-cutting, not per-feature)
- Mtime-based DB handle refresh for long-lived serve.mjs
- TTY guard on context graduate (error if stdin not piped)
- --callers/--impact display capped at 10 symbols; --json uncapped
- Test framework: node:test (built-in, zero dep)

## Testing
- Automated: node:test covering 32 codepaths (unit + integration)
- Manual verification: <TBD at implementation>

## Follow-up
- Context lifecycle (update/delete commands) -- tracked as TODO
- Semantic/vector search layer
- Auto-reindex on file save
- `brief query --fuzzy` for NL search
