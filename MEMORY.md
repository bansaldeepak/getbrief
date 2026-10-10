# Memory — brief

<!-- brief:memory-harness -->
Use `brief memory` commands instead of reading files directly:
- `brief memory list` — concise index of all memories
- `brief memory show <name>` — view a specific memory
- `brief memory create <name> --memtype=<type>` — create a new memory
- `brief memory update <name>` — update an existing memory

Do NOT read `documentation/memory/*.md` files directly — use the commands above.
<!-- /brief:memory-harness -->


Project management CLI + multi-agent installer. Standalone repo at `~/Work/Arcitae/brief/`.

## How to access

**Primary** — use `brief` CLI if installed:
```bash
brief search "<query>"          # searches memory + all project context
brief search "<query>" --memory # memory only
```

**Fallback** — read files directly from `documentation/memory/`.

## Reference

- [Config loading](documentation/memory/reference_agent-config-loading.md) — skills contribute only
  descriptions; `CLAUDE.md` and `rules/` load in full. Decides where any new rule belongs.
- [Session log formats](documentation/memory/reference_session-log-formats.md) — where Claude and
  Codex record branch and token usage.
- [Skills CLI, local sources](documentation/memory/reference_skills-cli-local-sources.md) — brief
  init symlinks directly; skills CLI copies (used only for remote/third-party skills).

## Active

- [Autonomous lifecycle](documentation/stories/autonomous-lifecycle/PRD.md) — approved and implemented shared workflow; [validation](documentation/stories/autonomous-lifecycle/VALIDATION.md) records review, tests, installation, and limits
- [Repo extraction](documentation/memory/project_repo-extraction.md) — brief is standalone at
  ~/Work/Arcitae/brief. BRIEF_SKILLS_PATH fixed; harness injection complete.
- [brief CLI](documentation/memory/project_next-steps-scaffold.md) — architecture, commands (incl.
  query/context/codegraph), project structure, and what's deferred.
- [Skills cleanup decisions](documentation/memory/project_skills-cleanup-decisions.md) — D8
  superseded, item.mjs delegation, enrichment aligned to gstack reviews

## Feedback

- [Discover must persist](documentation/memory/feedback_discover-must-persist.md) — /brief discover must always write DISCOVERY.md, not just conversation output
- [Design pivots → immediate test updates](documentation/memory/design-pivots-mid-impl-need-immediate-test-updates.md) — when design changes mid-impl, update tests first
- [Grep callers before removing return fields](documentation/memory/grep-all-callers-when-removing-a-return-field.md) — prevents vestigial fields in final commit
- [Test template injection for heading duplication](documentation/memory/test-template-injection-for-heading-duplication.md) — prefix + template h1 can create doubles
- [Lifecycle controls and scoped learning](documentation/memory/autonomous-lifecycle-controls-and-scoped-learning.md) — current approved modes, review/retro timing, and planning recall; explicit scope and promotion controls
- [Historical retro position](documentation/memory/feedback_lifecycle-retro-position.md) — timing superseded by lifecycle controls; original rationale and token-tracking removal retained
- [Status normalization](documentation/memory/feedback_status-normalization.md) — only first word of status field matters
- [Init patterns](documentation/memory/feedback_init-patterns.md) — atomic manifest, recursive mtime, marker merge
