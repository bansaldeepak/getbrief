# Deferred Work — Skills Cleanup & Consolidation

Items explicitly deferred from this epic (E5/TODO-010) to future work. This document is the handoff artifact — nothing here should be forgotten.

## Epic 1: Project Setup & Scoped Architecture

**Owner:** Next PRD after this ships.
**Trigger:** This epic must merge first.

### `/brief setup` — Interactive Project Configuration

The missing second half of `brief init`. Init copies all rule templates blindly (D9); setup does the smart part:

1. **Detection** — Parse `manifest.json` `detect` field against actual project files
2. **Interactive selection** — Present relevant templates, let user pick
3. **Agent handoff** — `brief init` can hand off to `/brief setup` for deeper config
4. **Recommend on first touch** — If `brief` rule detects unconfigured project, suggest `/brief setup`

### Project-Local Skill Templates — Reclassification

`templates/project-skills/` currently has 2 entries that need restructuring:

| Current | Problem | Proposed |
|---------|---------|----------|
| `hono-react-router-prisma/SKILL.md` (166 lines) | Named after specific libraries. Actually a **rule** (conventions, always applies), not a skill (procedural, invoked). | Split into: `techstack.md` rule (layout, aliases, wiring, testing config) + project-local `backend-standards.md` rule (route idiom, service signatures, error codes) |
| `hono-new-module/SKILL.md` (97 lines) | Name tied to Hono. Is a proper **skill** (procedural scaffold). | Rename to `scaffold-module` or `new-module`. Keep as skill. Remove Hono-specific details into the techstack rule it references. |

**Key insight from this epic:** The distinction is:
- **Rule** = "this is always true in this repo" → `.claude/rules/`
- **Skill** = "do this procedure when invoked" → `.claude/skills/`

The hono-react-router-prisma file is 100% convention statements ("Frontend never imports @backend", "PrismaClient is always the first parameter") — that's a rule. The scaffold-module file is 100% procedure ("create this structure, write these files, register it") — that's a skill.

**Proposed new structure for `templates/project-skills/`:**

```
templates/
  project-rules/          # NEW — rule templates for specific stacks
    techstack.md          # Layout, aliases, build config, quality gates
    # (backend-standards.md and frontend-standards.md already exist in templates/rules/)
  project-skills/         # EXISTING — procedural skill templates
    scaffold-module/SKILL.md   # Renamed from hono-new-module
    README.md                  # Updated
```

The techstack rule absorbs content from `hono-react-router-prisma` that's stack-specific (layout, aliases, testing configs, wiring). The framework-specific backend patterns (route idiom, service signatures) go into the project's `backend-standards.md` rule (which already has a template skeleton from this epic).

### Smart Rule Detection in `brief init`

Currently init copies ALL 7 rule templates. With `/brief setup`:
- Parse `detect` patterns from `manifest.json`
- Only suggest/copy relevant ones
- Allow user to pick additional ones
- Skip irrelevant ones (e.g., don't copy `frontend-standards.md` in a pure API repo)

### Project-Local Skill Installation

`/brief setup` should also offer to install project skills:
- Detect stack (Hono? Next? Express?)
- Offer relevant skill templates from `templates/project-skills/`
- Copy into project `.claude/skills/`
- Symlink for Codex compatibility (`.agents/skills/`)

## Epic 4: Tracker Restructure

- Retros as first-class tracker entities
- Context documents as first-class tracker entities
- Currently only stories, todos, bugs, memory tracked

## Epic 7: `brief serve`

- Independent, lower priority
- No details captured yet

## Other Deferred Items

| Item | Context | Where it came from |
|------|---------|-------------------|
| Multi-provider support (Gemini/Codex config) | Claude-only for now | PRD "What We Are NOT Building" |
| Automatic rule generation from code analysis | Rules start as templates, evolve via retros | PRD "What We Are NOT Building" |
| `shadcn-ui` skill — still symlinked globally | Low-frequency, UI-specific. Keep or convert to project skill? | Survived S-007 cleanup, worth revisiting in Epic 1 |
| Pre-mortem as standalone command | Absorbed into sdlc/bug + discover. Consider if `/pre-mortem` shortcut is worth keeping as alias | Decision made in this epic, monitor if users miss the standalone entry point |

## Decisions Made in This Epic That Constrain Epic 1

| Decision | ID | Constraint |
|----------|-----|-----------|
| Init copies ALL templates without detection | D9 | Epic 1's `/brief setup` adds the smart selection ON TOP of this — doesn't replace init's behavior |
| Rules use `paths:` frontmatter for conditional loading | — | Project rules must also use this pattern |
| Skill ≠ Rule distinction enforced | — | `templates/project-skills/` must be audited: anything that's "always true" moves to `project-rules/` |
| `manifest.json` has `detect` field (unused by init) | — | Epic 1 parses this field in `/brief setup` |
| AGENTS.md stays as-is (no rename) | D8 | Project AGENTS.md scaffold (R17) still references this name |
