#!/bin/bash
# Build provider-specific config files from shared AGENTS.md + provider overrides.
# Run after editing AGENTS.md or providers/*.md
# Can be triggered via git hook (pre-commit) in this repo.

set -euo pipefail

AGENTS_DIR="$HOME/.agents"
SHARED="$AGENTS_DIR/AGENTS.md"

if [ ! -f "$SHARED" ]; then
  echo "ERROR: $SHARED not found"
  exit 1
fi

# Build Claude
cat "$SHARED" "$AGENTS_DIR/providers/claude.md" > "$HOME/.claude/CLAUDE.md"
echo "✓ ~/.claude/CLAUDE.md"

# Build Codex
cat "$SHARED" "$AGENTS_DIR/providers/codex.md" > "$HOME/.codex/AGENTS.md"
echo "✓ ~/.codex/AGENTS.md"

# Build Gemini
cat "$SHARED" "$AGENTS_DIR/providers/gemini.md" > "$HOME/.gemini/GEMINI.md"
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

# --- Distribute agents -----------------------------------------------------
# Claude reads the shared definition directly (symlink — edits are live).
# Codex needs a TOML translation, so its copy is GENERATED and must never be
# hand-edited; check.sh re-generates and diffs to catch that. Gemini has no
# subagent concept and is skipped. Fields with no Codex equivalent (per-tool
# allowlists, maxTurns) are reported by the generator rather than dropped
# silently — sandbox_mode is a coarser approximation of a read-only agent.
mkdir -p "$HOME/.claude/agents" "$HOME/.codex/agents"
agent_count=0
for agent in "$AGENTS_DIR"/agents/*.md; do
  [ -e "$agent" ] || continue
  base="$(basename "$agent" .md)"
  ln -sfn "$agent" "$HOME/.claude/agents/$base.md"
  python3 "$AGENTS_DIR/scripts/gen-codex-agent.py" "$agent" > "$HOME/.codex/agents/$base.toml"
  agent_count=$((agent_count + 1))
done
echo "✓ ~/.claude/agents — $agent_count linked · ~/.codex/agents — $agent_count generated"

echo ""
echo "All provider configs + rules + agents synced from ~/.agents/"
