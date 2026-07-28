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
├── custom-skills/      # Skills we wrote — the publishable set (19)
│   ├── coding-standards/
│   ├── db-safety/
│   ├── first-principles/
│   └── ...
├── skills/             # Third-party skills, owned by the `skills` CLI
│   ├── gstack/         # via garrytan/gstack
│   ├── stitch-*/       # via google-labs-code/stitch-skills
│   └── ...             # provenance tracked in .skill-lock.json
└── rules/              # Auto-apply rules (glob-matched)
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
