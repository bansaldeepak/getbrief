#!/bin/bash
# ~/.agents/setup.sh — Link shared agent config to all providers
set -euo pipefail

AGENTS_DIR="$HOME/.agents"

echo "Setting up unified agent configuration..."

# Create provider directories if needed
mkdir -p "$HOME/.claude" "$HOME/.codex" "$HOME/.gemini"

# Symlink skills
for provider in .claude .codex; do
  target="$HOME/$provider/skills"
  if [ -L "$target" ]; then
    echo "  ✓ $target (already linked)"
  elif [ -d "$target" ]; then
    echo "  ⚠ $target exists as directory — back up and replace manually"
  else
    ln -sf "$AGENTS_DIR/skills" "$target"
    echo "  ✓ $target → $AGENTS_DIR/skills"
  fi
done

# Rules are distributed per-file by build.sh (below), NOT symlinked as a whole
# directory here. A directory symlink would bury each host's own policy files —
# e.g. ~/.codex/rules/default.rules (Codex's command allowlist). build.sh links
# each *.md individually and leaves everything else in place.

# Build provider configs + distribute rules
echo ""
"$AGENTS_DIR/build.sh"

# Final gate: verify every provider dir matches the ~/.agents/ source.
echo ""
"$AGENTS_DIR/check.sh"

# Check gstack env vars
echo ""
if grep -q "GSTACK_INSTALL_DIR" "$HOME/.zshrc" 2>/dev/null; then
  echo "✓ GSTACK env vars found in ~/.zshrc"
else
  echo "⚠ Add to ~/.zshrc for gstack support:"
  echo '  export GSTACK_INSTALL_DIR="$HOME/.agents/skills/gstack"'
  echo '  export GSTACK_SKILLS_DIR="$HOME/.agents/skills"'
fi

echo ""
echo "Done. All providers synced from ~/.agents/"
