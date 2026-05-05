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

# Symlink rules
for provider in .claude .codex; do
  target="$HOME/$provider/rules"
  if [ -L "$target" ]; then
    echo "  ✓ $target (already linked)"
  elif [ -d "$target" ]; then
    echo "  ⚠ $target exists as directory — back up and replace manually"
  else
    ln -sf "$AGENTS_DIR/rules" "$target"
    echo "  ✓ $target → $AGENTS_DIR/rules"
  fi
done

# Build provider configs
echo ""
"$AGENTS_DIR/build.sh"

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
