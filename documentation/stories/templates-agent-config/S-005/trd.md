# TRD: Templates & Agent Config

**Status**: skipped
**Reason**: No new services, schemas, or architectural patterns. All changes are text replacements in templates, skills, and config files. The only code change is removing 4 lines from `brief/lib/init.mjs` and adding ~3 lines for `.claude/CLAUDE.md` scaffolding.

## Approach
Mechanical find-and-replace of knowledge graph references with brief CLI commands across templates, skills, and provider configs. No architectural decisions needed.
