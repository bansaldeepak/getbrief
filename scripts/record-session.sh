#!/bin/bash
# Append this session's id to the repo's session log, for exact token attribution.
#
# Wire as a SessionStart hook (see "Wiring" below). Optional: token-usage.py
# already attributes by git branch, which both hosts record and which works
# retroactively. This log only earns its keep when a branch is shared by several
# stories, or when work happens off-branch — then `--sessions-file` is exact
# where `--branch` would over-count.
#
# Writes:  <repo>/documentation/.sessions.jsonl
#   {"provider":"claude","session_id":"…","branch":"…","cwd":"…","started":"…"}
#
# Never fails a session start: every path exits 0.
#
# Wiring — Claude Code, ~/.claude/settings.json:
#   { "hooks": { "SessionStart": [ { "hooks": [
#       { "type": "command", "command": "~/.agents/scripts/record-session.sh claude" } ] } ] } }
#
# Wiring — Codex, ~/.codex/hooks.json:
#   { "hooks": { "SessionStart": [
#       { "type": "command", "command": "~/.agents/scripts/record-session.sh codex" } ] } }
#
# Both hosts pass hook context as JSON on stdin; the field holding the session id
# differs and has moved between versions, so this reads any of the plausible keys
# and falls back to the host's env var. Verify against your installed version:
#   echo '{}' | ~/.agents/scripts/record-session.sh claude   # should no-op cleanly

set -uo pipefail

PROVIDER="${1:-unknown}"

# Only record inside a git repo — the log lives next to the stories it explains.
REPO="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -n "$REPO" ] || exit 0

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"

# stdin may be a hook payload, may be empty, may not be JSON. Never block on it.
PAYLOAD=""
if [ ! -t 0 ]; then
  PAYLOAD="$(timeout 2 cat 2>/dev/null || true)"
fi

SESSION_ID="$(
  PAYLOAD="$PAYLOAD" python3 - <<'PY' 2>/dev/null || true
import json, os, sys

raw = os.environ.get("PAYLOAD", "").strip()
candidates = ("session_id", "sessionId", "id", "conversation_id", "thread_id")

def dig(obj):
    if isinstance(obj, dict):
        for k in candidates:
            v = obj.get(k)
            if isinstance(v, str) and len(v) >= 8:
                return v
        for v in obj.values():
            found = dig(v)
            if found:
                return found
    return None

sid = None
if raw:
    try:
        sid = dig(json.loads(raw))
    except json.JSONDecodeError:
        pass
sid = sid or os.environ.get("CLAUDE_SESSION_ID") or os.environ.get("CODEX_SESSION_ID")
if sid:
    print(sid)
PY
)"

# No id means nothing useful to record — branch attribution still covers it.
[ -n "$SESSION_ID" ] || exit 0

LOG="$REPO/documentation/.sessions.jsonl"
mkdir -p "$(dirname "$LOG")" 2>/dev/null || exit 0

# Idempotent: a resumed session must not be counted twice.
if [ -f "$LOG" ] && grep -q "\"$SESSION_ID\"" "$LOG" 2>/dev/null; then
  exit 0
fi

printf '{"provider":"%s","session_id":"%s","branch":"%s","cwd":"%s","started":"%s"}\n' \
  "$PROVIDER" "$SESSION_ID" "$BRANCH" "$PWD" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  >> "$LOG" 2>/dev/null || true

exit 0
