#!/bin/bash
# setup.sh — Link brief's agent config to all providers
set -euo pipefail

BRIEF_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Setting up brief agent configuration..."

# Create provider directories if needed
mkdir -p "$HOME/.claude" "$HOME/.codex" "$HOME/.gemini"

# Build provider configs + distribute rules + agents
echo ""
"$BRIEF_DIR/build.sh"

# Final gate: verify every provider dir matches the source.
echo ""
"$BRIEF_DIR/check.sh"

echo ""
echo "Done. All providers synced from $BRIEF_DIR/"
