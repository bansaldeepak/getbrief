#!/bin/bash
# Reset the memory checkpoint counter. Run at session start or manually.
STATE_DIR="$HOME/.claude/hook-state"
echo "0" > "$STATE_DIR/memory_counter"
