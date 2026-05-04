#!/bin/bash
# Build provider-specific config files from shared WORKFLOW.md + provider overrides.
# Run after editing WORKFLOW.md or providers/*.md
# Can be triggered via git hook (pre-commit) in this repo.

set -euo pipefail

AGENTS_DIR="$HOME/.agents"
WORKFLOW="$AGENTS_DIR/WORKFLOW.md"

if [ ! -f "$WORKFLOW" ]; then
  echo "ERROR: $WORKFLOW not found"
  exit 1
fi

# Build Claude
cat "$WORKFLOW" "$AGENTS_DIR/providers/claude.md" > "$HOME/.claude/CLAUDE.md"
echo "✓ ~/.claude/CLAUDE.md"

# Build Codex
cat "$WORKFLOW" "$AGENTS_DIR/providers/codex.md" > "$HOME/.codex/AGENTS.md"
echo "✓ ~/.codex/AGENTS.md"

# Build Gemini
cat "$WORKFLOW" "$AGENTS_DIR/providers/gemini.md" > "$HOME/.gemini/GEMINI.md"
echo "✓ ~/.gemini/GEMINI.md"

echo ""
echo "All provider configs synced from ~/.agents/"
