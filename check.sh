#!/bin/bash
# ~/.agents/check.sh — Verify every provider dir is in sync with ~/.agents/ source.
#
# Read-only: never writes, links, or deletes anything. Exits non-zero on any
# drift so it can gate a pre-commit hook or CI. To fix what this reports, run
# build.sh. This is the guard that catches the failure modes build.sh alone
# can't: a generated config edited by hand instead of at source, a new rule that
# was never distributed, or a stale link left behind when a rule was deleted.
set -uo pipefail   # NOT -e — collect every failure, don't stop at the first.

AGENTS_DIR="$HOME/.agents"
WORKFLOW="$AGENTS_DIR/WORKFLOW.md"
RULE_HOSTS=(claude codex)   # MUST match build.sh's RULE_HOSTS.

fail=0
note() { printf '  %s\n' "$1"; }

if [ ! -f "$WORKFLOW" ]; then
  echo "ERROR: $WORKFLOW not found"
  exit 1
fi

# --- Provider configs ------------------------------------------------------
# Each generated file must equal WORKFLOW.md + its provider override, byte for
# byte. A mismatch means someone edited the generated file instead of the source.
echo "Provider configs:"
check_config() {
  local label="$1" override="$2" out="$3"
  if [ ! -f "$out" ]; then
    note "✗ $label missing — run build.sh"; fail=1; return
  fi
  if diff -q <(cat "$WORKFLOW" "$AGENTS_DIR/providers/$override") "$out" >/dev/null 2>&1; then
    note "✓ $label"
  else
    note "✗ $label drifted from source — edit WORKFLOW.md / providers/$override, then build.sh"; fail=1
  fi
}
check_config "~/.claude/CLAUDE.md" claude.md "$HOME/.claude/CLAUDE.md"
check_config "~/.codex/AGENTS.md"  codex.md  "$HOME/.codex/AGENTS.md"
check_config "~/.gemini/GEMINI.md" gemini.md "$HOME/.gemini/GEMINI.md"

# --- Rule distribution -----------------------------------------------------
# Two-way check per host:
#   1. every source rule is linked in, pointing back at the source file;
#   2. every *.md symlink in the host dir is backed by a live source rule.
# Non-.md files (e.g. Codex's default.rules allowlist) are never touched.
echo ""
echo "Rule distribution:"
for host in "${RULE_HOSTS[@]}"; do
  dest="$HOME/.$host/rules"
  host_ok=1

  # 1. source → host
  for rule in "$AGENTS_DIR"/rules/*.md; do
    [ -e "$rule" ] || continue
    base=$(basename "$rule")
    link="$dest/$base"
    if [ ! -L "$link" ]; then
      note "✗ ~/.$host/rules/$base missing — run build.sh"; fail=1; host_ok=0
    elif [ "$(readlink "$link")" != "$rule" ]; then
      note "✗ ~/.$host/rules/$base → $(readlink "$link"), expected $rule"; fail=1; host_ok=0
    elif [ ! -e "$link" ]; then
      note "✗ ~/.$host/rules/$base is dangling (target gone)"; fail=1; host_ok=0
    fi
  done

  # 2. host → source (orphans)
  for link in "$dest"/*.md; do
    [ -L "$link" ] || continue
    base=$(basename "$link")
    if [ ! -e "$AGENTS_DIR/rules/$base" ]; then
      note "✗ ~/.$host/rules/$base is an orphan — no ~/.agents/rules/$base (delete it)"; fail=1; host_ok=0
    fi
  done

  [ "$host_ok" -eq 1 ] && note "✓ ~/.$host/rules"
done

# --- Agent distribution ----------------------------------------------------
# Claude's copy is a symlink (same two-way check as rules). Codex's is
# GENERATED, so the check is a re-generate-and-diff: it catches a hand-edited
# TOML, a stale one whose source moved on, and an orphan whose source is gone.
echo ""
echo "Agent distribution:"
agents_ok=1
for agent in "$AGENTS_DIR"/agents/*.md; do
  [ -e "$agent" ] || continue
  base=$(basename "$agent" .md)

  link="$HOME/.claude/agents/$base.md"
  if [ ! -L "$link" ]; then
    note "✗ ~/.claude/agents/$base.md missing — run build.sh"; fail=1; agents_ok=0
  elif [ "$(readlink "$link")" != "$agent" ]; then
    note "✗ ~/.claude/agents/$base.md → $(readlink "$link"), expected $agent"; fail=1; agents_ok=0
  fi

  toml="$HOME/.codex/agents/$base.toml"
  if [ ! -f "$toml" ]; then
    note "✗ ~/.codex/agents/$base.toml missing — run build.sh"; fail=1; agents_ok=0
  elif ! diff -q <(python3 "$AGENTS_DIR/scripts/gen-codex-agent.py" "$agent" 2>/dev/null) "$toml" >/dev/null 2>&1; then
    note "✗ ~/.codex/agents/$base.toml drifted — edit agents/$base.md, then build.sh"; fail=1; agents_ok=0
  fi
done

for orphan in "$HOME"/.codex/agents/*.toml; do
  [ -e "$orphan" ] || continue
  base=$(basename "$orphan" .toml)
  if [ ! -e "$AGENTS_DIR/agents/$base.md" ]; then
    note "✗ ~/.codex/agents/$base.toml is an orphan — no ~/.agents/agents/$base.md (delete it)"; fail=1; agents_ok=0
  fi
done

for orphan in "$HOME"/.claude/agents/*.md; do
  [ -L "$orphan" ] || continue
  base=$(basename "$orphan" .md)
  if [ ! -e "$AGENTS_DIR/agents/$base.md" ]; then
    note "✗ ~/.claude/agents/$base.md is an orphan — no ~/.agents/agents/$base.md (delete it)"; fail=1; agents_ok=0
  fi
done

[ "$agents_ok" -eq 1 ] && note "✓ ~/.claude/agents + ~/.codex/agents"

echo ""
if [ "$fail" -ne 0 ]; then
  echo "OUT OF SYNC — run ~/.agents/build.sh, then re-run this check."
  exit 1
fi
echo "In sync. All provider configs + rules + agents match ~/.agents/ source."
