# ~/.agents — Unified AI Agent Configuration

Central hub for all AI coding agents (Claude Code, OpenAI Codex, Google Gemini CLI). One source of truth for workflow, skills, and rules — shared across providers.

## Structure

```
~/.agents/
├── README.md            # This file
├── WORKFLOW.md          # Shared workflow rules (all providers)
├── build.sh            # Syncs WORKFLOW + provider overrides → provider configs
├── providers/
│   ├── claude.md       # Claude-specific additions → ~/.claude/CLAUDE.md
│   ├── codex.md        # Codex-specific additions → ~/.codex/AGENTS.md
│   └── gemini.md       # Gemini-specific additions → ~/.gemini/GEMINI.md
├── skills/             # Shared skills (symlinked into each provider)
│   ├── gstack*/        # gstack plugin skills (39 skills)
│   ├── coding-standards/
│   ├── db-safety/
│   ├── first-principles/
│   └── ...             # ~78 total skills
└── rules/              # Auto-apply rules (glob-matched)
    ├── clerk-user-resolution.md
    └── codegraph.md
```

## How It Works

### Provider Config Generation

`build.sh` concatenates `WORKFLOW.md` + provider-specific overrides:

```bash
~/.agents/build.sh
# Output:
# ✓ ~/.claude/CLAUDE.md
# ✓ ~/.codex/AGENTS.md
# ✓ ~/.gemini/GEMINI.md
```

Each provider gets identical workflow rules + its own tool mappings and memory conventions.

### Skills Distribution

Skills live in `~/.agents/skills/`. Each provider symlinks to them:

| Provider | Symlink |
|----------|---------|
| Claude Code | `~/.claude/skills/ → ~/.agents/skills/` |
| Codex | `~/.codex/skills/ → ~/.agents/skills/` |
| Gemini | Native `~/.agents/skills/` support |

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

# Create provider symlinks
ln -sf ~/.agents/skills ~/.claude/skills
ln -sf ~/.agents/skills ~/.codex/skills
ln -sf ~/.agents/rules ~/.claude/rules
ln -sf ~/.agents/rules ~/.codex/rules

# Build provider configs
~/.agents/build.sh

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
# Create skill directory with SKILL.md
mkdir ~/.agents/skills/my-skill
cat > ~/.agents/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: What it does and when to trigger
---
Skill content here.
EOF
```

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
