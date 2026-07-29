#!/bin/bash
# Memory checkpoint — nudges a long session to capture memory before it ends.
#
# Hook: UserPromptSubmit. Output is injected into the agent's context.
# Counter is reset by memory-reset-counter.sh at SessionStart.
#
# Why this exists alongside the gates: WORKFLOW.md requires capture at three
# lifecycle gates (post-planning, post-implementation, post-ship). A long
# session can run for hours without crossing one and still produce plenty worth
# keeping — this is the safety net for that case, not a second convention.
#
# It must name WHERE memory goes. "Save to memory" with no target is how a
# session ends up writing to the provider config directory, which the global
# CLAUDE.md forbids.

STATE_DIR="$HOME/.claude/hook-state"
COUNTER_FILE="$STATE_DIR/memory_counter"
THRESHOLD=15

mkdir -p "$STATE_DIR" 2>/dev/null || exit 0

COUNT=0
[ -f "$COUNTER_FILE" ] && COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
case "$COUNT" in '' | *[!0-9]*) COUNT=0 ;; esac
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE" 2>/dev/null || exit 0

if [ $((COUNT % THRESHOLD)) -eq 0 ]; then
  echo "Memory checkpoint (message #$COUNT). Has this session produced anything durable — a decision and the alternatives it rejected, a user correction, a gotcha that cost real time, or a constraint not derivable from the code?"
  echo ""
  echo "If yes, write it to the CURRENT REPO: MEMORY.md at the root (index, under ~40 lines) plus one file per fact in memory/. Never to the provider config directory. Format: the project-memory skill."
  echo ""
  echo "If nothing is notable, say \"No new memory at this checkpoint\" and continue — a skipped gate should stay visible."
fi
