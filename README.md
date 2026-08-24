# ~/.agents — Unified AI Agent Configuration

Central hub for all AI coding agents (Claude Code, OpenAI Codex, Google Gemini CLI). One source of truth for workflow, skills, and rules — shared across providers.

## Structure

```
~/.agents/
├── README.md            # This file
├── MEMORY.md            # Memory index (points to documentation/memory/)
├── WORKFLOW.md          # Shared workflow rules (all providers)
├── build.sh            # Syncs WORKFLOW + provider overrides → provider configs
├── providers/
│   ├── claude.md       # Claude-specific additions → ~/.claude/CLAUDE.md
│   ├── codex.md        # Codex-specific additions → ~/.codex/AGENTS.md
│   └── gemini.md       # Gemini-specific additions → ~/.gemini/GEMINI.md
├── brief/              # Project management + code search CLI (npm link)
│   ├── cli.mjs         # Entry point — `brief <command>`
│   ├── lib/
│   │   ├── code-index.mjs      # Codegraph JS API wrapper (search/callers/edges)
│   │   ├── context.mjs         # Graduated context (graduate/list/search)
│   │   ├── commands/query.mjs  # Unified code+docs search
│   │   ├── commands/context.mjs
│   │   ├── init.mjs            # Project scaffold + codegraph index
│   │   └── search.mjs          # Doc-only search
│   └── test/            # node:test suite (34 tests)
├── documentation/       # Project tracking (this repo's own work)
│   ├── PROJECT-TRACKER.md
│   ├── tracker.yaml
│   ├── stories/         # Feature folders (PRD, TRD, story, tasks, retro)
│   ├── memory/          # Agent memory files
│   └── logs/            # One file per log entry (multi-agent safe)
├── custom-skills/      # Skills we wrote — the publishable set
│   ├── sdlc/                # router — owns the lifecycle graph
│   │   ├── prd/  trd/  discover/  project-plan/
│   │   └── pr-review/  retro/  decision-doc/  memory-review/
│   ├── brief/               # project management CLI router
│   └── project-memory/      # memory management skill
├── agents/             # Subagent definitions — one source, two formats
│   ├── qa.md  reviewer.md  researcher.md  self-improving.md
├── scripts/
│   ├── gen-codex-agent.py     # agents/*.md → Codex TOML
│   ├── check-references.py    # every skill name and path must resolve
│   ├── token-usage.py         # per-story cost, Claude + Codex, by branch
│   ├── memory-checkpoint.sh   # UserPromptSubmit nudge (hook)
│   ├── memory-reset-counter.sh# SessionStart counter reset (hook)
│   └── record-session.sh      # optional SessionStart hook → .sessions.jsonl
├── templates/          # Copied into repos on purpose — never linked
│   └── project-skills/ # Stack-specific skills (see its README)
├── skills/             # Third-party skills, owned by the `skills` CLI
│   ├── gstack/         # via garrytan/gstack — routed, in use
│   └── shadcn-ui/      # via google-labs-code/stitch-skills
│                       # provenance tracked in .skill-lock.json
└── rules/              # Auto-apply rules (glob-matched)
    ├── brief.md             # brief CLI reference (auto-loads on docs)
    ├── coding-standards.md  # modularity, naming, type safety, error handling
    ├── documentation-standards.md  # doc modularity, ordering, diagrams
    ├── git-workflow.md      # branch naming, push safety, commit convention
    └── observability.md     # 4 signals, abstraction, failure isolation
```

## How It Works

### Provider Config Generation

`build.sh` concatenates `WORKFLOW.md` + provider-specific overrides. A **pre-commit hook** runs it automatically on every commit — provider configs are always in sync:

```bash
~/.agents/build.sh
# Output:
# ✓ ~/.claude/CLAUDE.md
# ✓ ~/.codex/AGENTS.md
# ✓ ~/.gemini/GEMINI.md
# ✓ ~/.claude/rules — N rule(s) linked
# ✓ ~/.claude/agents — N linked · ~/.codex/agents — N generated
```

Each provider gets identical workflow rules + its own tool mappings and memory conventions.

### brief CLI — Project Management + Code Search

`brief` is the unified interface for project tracking and code exploration. Installed globally via `npm link` from `~/.agents/brief/`.

```bash
# Code + doc search (primary lookup — use this by default)
brief query "handleSubmit"          # shows callees + callers
brief query --full "handleSubmit"   # full explore: source, edges, usages, impact

# Project tracking
brief story list                    # active stories
brief todo list                     # open TODOs
brief status                        # summary counts

# Setup (in any project)
brief init                          # scaffold docs + codegraph index
brief init --reindex                # force-rebuild codegraph
```

Bundles `@colbymchenry/codegraph` (code AST analysis) — no separate install needed. See `rules/brief.md` for full command reference.

### Skills Distribution

Our own skills live in `~/.agents/custom-skills/`; third-party skills stay in
`~/.agents/skills/` under the `skills` CLI and its `.skill-lock.json`.

`setup.sh` links **one symlink per skill**, never the whole directory — a
directory symlink would bury each host's own entries (for example
`~/.codex/skills/codex-primary-runtime`). Links point at the real directory, so
editing a skill takes effect immediately with no re-install step.

| Provider | Link |
|----------|------|
| Claude Code | `~/.claude/skills/<skill> → ~/.agents/custom-skills/<skill>` |
| Codex | `~/.codex/skills/<skill> → ~/.agents/custom-skills/<skill>` |

Third-party skills are linked in selectively, by hand.

### Agents Distribution

One definition in `agents/<name>.md`, two outputs:

| Provider | Output | How |
|----------|--------|-----|
| Claude Code | `~/.claude/agents/<name>.md` | Symlink — edits are live |
| Codex | `~/.codex/agents/<name>.toml` | **Generated** by `build.sh` — never hand-edit |
| Gemini | — | No subagent concept |

The formats aren't isomorphic. `model` maps through an alias table (`haiku` →
`gpt-5.6-terra`/`low`, `sonnet` → `gpt-5.6`/`medium`, `opus` → `gpt-5.6`/`high`), and Codex has no
per-tool allowlist — an agent without `Write`/`Edit` becomes `sandbox_mode = "read-only"`, which is
coarser than Claude's `tools` list. `maxTurns` and `memory` have no equivalent and are dropped. The
generator prints every approximation it makes; `check.sh` re-generates and diffs to catch a
hand-edited or stale TOML.

### Reference Checking

`check.sh` verifies that provider configs *match* the source. `scripts/check-references.py` verifies
they *point at things that exist* — a different failure, and the one that actually bites:

```
`name` skill  /  skill `name`   → the skill must exist (externals allowlisted in the script)
~/.agents/<path>                → the path must resolve
[text](relative/path)           → the link target must exist
```

Fenced blocks are skipped, and paths containing `<` are treated as placeholders, so templates and
how-to snippets don't trip it.

A rename or deletion orphans every mention of the old name, and nothing else here would notice. This
check found a live one the first time it ran.

### Hooks

`memory-checkpoint.sh` (UserPromptSubmit) nudges a long session to capture memory every 15 messages;
`memory-reset-counter.sh` (SessionStart) resets the count. They are wired in `~/.claude/settings.json`
by absolute path — **not** distributed by `build.sh`, since Claude and Codex use different hook
formats. Codex wiring is still manual.

The nudge names the target on purpose. "Save to memory" without a destination is how a session ends
up writing to the provider config directory, which the global `CLAUDE.md` forbids.

### Token Accounting

`scripts/token-usage.py` reports a story's real cost across **both** hosts. Claude and Codex each
record the git branch in their session logs, so the branch is the scope — exact, retroactive, and
needing no setup:

```bash
~/.agents/scripts/token-usage.py --branch feature/thing --project ~/Work/app
~/.agents/scripts/token-usage.py --branch feature/thing --list   # which sessions matched
```

Date windows (`--after`) remain available but are approximate when stories overlap. For repos where
one branch carries several stories, wire `scripts/record-session.sh` as a SessionStart hook and use
`--sessions-file` — see the header of that script for the config snippets.

Accounting differs per host and the script accounts for it: Claude reports cache-create and
cache-read separately, both billable input; Codex reports `cached_input_tokens` as a subset of
`input_tokens`, so its total is input + output only.

### Rules Distribution

Rules in `~/.agents/rules/` auto-apply based on `globs` frontmatter:

| Provider | Symlink |
|----------|---------|
| Claude Code | `~/.claude/rules/ → ~/.agents/rules/` |
| Codex | `~/.codex/rules/ → ~/.agents/rules/` |

## Setup

### First-Time Install

```bash
# Clone or init
git init ~/.agents

# Link skills + rules and build provider configs, then verify
~/.agents/setup.sh

# gstack (optional) — set env vars in ~/.zshrc:
export GSTACK_INSTALL_DIR="$HOME/.agents/skills/gstack"
export GSTACK_SKILLS_DIR="$HOME/.agents/skills"
```

### After Editing Workflow

```bash
# Edit shared rules
vim ~/.agents/WORKFLOW.md

# Rebuild all provider configs
~/.agents/build.sh
```

### Adding a New Skill

```bash
# Create skill directory with SKILL.md, then re-run setup.sh to link it
mkdir ~/.agents/custom-skills/my-skill
cat > ~/.agents/custom-skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: What it does and when to trigger
---
Skill content here.
EOF
```

### Adding a Third-Party Skill

Use the `skills` CLI — it handles linking, so don't hand-roll symlinks. Run it from `$HOME`, not
from inside a project, or it installs as a "project" skill of whatever directory you were in:

```bash
cd ~ && npx skills add <owner>/<repo> -g -a claude-code -a codex -s <skill-name> -y
```

- `-g` = user-level. The canonical copy lands in `~/.agents/skills/`, so it stays git-tracked here.
- **`-a` must be repeated, not comma-separated** — `-a claude-code,codex` is rejected as an invalid
  agent even though both names are valid on their own.
- `-s` picks one skill out of a multi-skill repo; `-l` lists them without installing.
- `npx skills update -g` keeps them current. Re-running `add` also updates in place.

The two hosts are handled differently and both are correct: Claude Code gets a **symlink** at
`~/.claude/skills/<name>`, while Codex is marked **universal** and gets nothing — it reads
`$HOME/.agents/skills` natively, so a `~/.codex/skills/` link would be redundant.

Two things the CLI does **not** do on `remove`: it leaves the entry in `.skill-lock.json`, and it
only unlinks agents it registered itself — a symlink you created by hand is left dangling. Check
both after removing.

**Before installing, ask what the skill needs.** Most third-party skills are wrappers around an MCP
server or a CLI; without that dependency they cannot function, but their description still occupies
a slot in every session's skill listing. 14 skills were removed in one pass for exactly this reason.

### Adding a New Rule

```bash
cat > ~/.agents/rules/my-rule.md << 'EOF'
---
description: When this rule applies
globs: ["src/**/*.ts"]
---
Rule content here.
EOF
```

## gstack Plugin

[gstack](https://github.com/garrytan/gstack) installs into `~/.agents/skills/gstack/` and distributes sub-skills via `gstack-relink`.

Required env vars (in `~/.zshrc`):

```bash
export GSTACK_INSTALL_DIR="$HOME/.agents/skills/gstack"
export GSTACK_SKILLS_DIR="$HOME/.agents/skills"
```

After gstack upgrade: `gstack-relink` re-creates skill symlinks automatically.

## Design Principles

- **Single source of truth** — edit once, all providers get it
- **Provider-agnostic workflow** — same lifecycle regardless of agent
- **Provider-specific tools** — each agent gets appropriate tool mappings
- **Git-tracked** — version control for your agent configuration
- **Project instructions via `AGENTS.md`** — per-repo overrides live in the repo, not here
