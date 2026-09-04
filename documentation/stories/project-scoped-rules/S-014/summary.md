# S-014: Project-Scoped Rules & Smart Init -- Summary

## What Changed
- T-001: Created templates/rules/techstack.md (4 sections: stack, runtime, aliases, structure) + manifest entry (12th template, detect:["*"])
- T-002: Created skills/brief/scaffold-module/SKILL.md (generic module scaffold, reads techstack.md, language fallbacks) + router entry in skills/brief/SKILL.md

## Decisions Made
- Single-pass regex for escape handling (avoids ordering bugs with sequential .replace)
- Pass projectRoot to matchesDetection (Option A — smaller change than expanding detection result)
- detect:["*"] and detect:[".git"] classify as universal rules (collapsed in display)
- Export matchesDetection and filterRelevantRules for direct unit testing
- Check both wrangler.toml and wrangler.jsonc (user decision from eng review)
- Escape decoding proceeds as-is — no --raw-body flag needed (macOS/Linux tool, prose input)
- Keep rules-gen.mjs for cross-provider future (CEO review decision)
- techstack.md has narrow scope: stack list, runtime config, aliases, structure (not route idioms)

## Testing
- test/body.test.mjs: 8 new test cases for readBody escape handling (must use await)
- test/init.test.mjs: 7 new test cases for matchesDetection expansion
- Manual: grouped display, scaffold-module skill invocation
- <TBD at implementation>

## Follow-up
- TODO-013: brief update + brief uninstall commands (stale rule removal)
- TODO-015: expand detectStack for observability/analytics packages
- TODO-012: verify Gemini .agents/rules/ compatibility
