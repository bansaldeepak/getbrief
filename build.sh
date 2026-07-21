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

# --- Distribute rules ------------------------------------------------------
# Per-file symlinks, never a directory symlink: each agent keeps its own
# policy files alongside (e.g. ~/.codex/rules/default.rules is Codex's command
# allowlist, not a shared rule). Symlink (not copy) so an edited rule is live
# everywhere immediately. Only *.md is touched — nothing else is added or removed.
# Rules are a Claude Code / Codex concept; Gemini has no rules dir, so it is
# excluded rather than given links it will not read.
RULE_HOSTS=(claude codex)
for host in "${RULE_HOSTS[@]}"; do
  dest="$HOME/.$host/rules"
  mkdir -p "$dest"
  count=0
  for rule in "$AGENTS_DIR"/rules/*.md; do
    [ -e "$rule" ] || continue
    ln -sfn "$rule" "$dest/$(basename "$rule")"
    count=$((count + 1))
  done
  echo "✓ ~/.$host/rules — $count rule(s) linked"
done

echo ""
echo "All provider configs + rules synced from ~/.agents/"
