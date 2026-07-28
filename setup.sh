#!/bin/bash
# ~/.agents/setup.sh — Link shared agent config to all providers
set -euo pipefail

AGENTS_DIR="$HOME/.agents"

echo "Setting up unified agent configuration..."

# Create provider directories if needed
mkdir -p "$HOME/.claude" "$HOME/.codex" "$HOME/.gemini"

# Symlink our own skills, one per skill — NOT the whole directory. Same reason
# rules are distributed per-file (see below): a directory symlink would bury each
# host's own entries, e.g. ~/.codex/skills/codex-primary-runtime and .system.
# Only custom-skills/ is ours; skills/ is owned by the `skills` CLI via
# .skill-lock.json and is linked selectively by hand, so it is left alone here.
echo "Linking custom skills..."
for provider in .claude .codex; do
  target="$HOME/$provider/skills"
  mkdir -p "$target"
  for skill in "$AGENTS_DIR"/custom-skills/*/; do
    name="$(basename "$skill")"
    link="$target/$name"
    if [ -e "$link" ] && [ ! -L "$link" ]; then
      echo "  ⚠ $provider/skills/$name is a real directory — not overwriting"
      continue
    fi
    ln -sfn "$AGENTS_DIR/custom-skills/$name" "$link"
  done
  echo "  ✓ $target ← custom-skills/ ($(ls -1 "$AGENTS_DIR"/custom-skills | wc -l | tr -d ' ') skills)"
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
