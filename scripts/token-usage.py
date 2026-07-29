#!/usr/bin/env python3
"""Token usage across Claude Code and Codex sessions.

Both hosts record the git branch in their session logs, so a story's real cost is
"every session on its branch" — exact, retroactive, and needing no capture step.
Date windows are a fallback for work done off-branch, and are approximate whenever
two stories overlap in time.

Usage:
    token-usage.py --branch feature/thing
    token-usage.py --branch feature/thing --project ~/Work/app
    token-usage.py --session <uuid>
    token-usage.py --sessions-file documentation/.sessions.jsonl
    token-usage.py --project . --after 2026-07-01

Options:
    --branch NAME         git branch recorded in the session
    --project PATH        repo path; matches the session cwd (prefix match)
    --session UUID        one session, repeatable
    --sessions-file PATH  newline/JSONL file of session ids (see record-session.sh)
    --after / --before    YYYY-MM-DD bounds on session start
    --provider            claude | codex | all   (default: all)
    --list                list matched sessions instead of totalling

Accounting note: Claude reports cache-create and cache-read separately, and both
are billable input. Codex reports `cached_input_tokens` as a subset of
`input_tokens`, so its Input column already contains the cached portion and the
total is input + output only — adding the cache column again would double-count.
"""

import argparse
import glob
import json
import os
import sys
from pathlib import Path

CLAUDE_ROOT = Path.home() / ".claude" / "projects"
CODEX_ROOT = Path.home() / ".codex" / "sessions"


def claude_model(model_id):
    if not model_id or model_id == "<synthetic>":
        return None
    for alias in ("opus", "sonnet", "haiku", "fable"):
        if alias in model_id:
            return alias.capitalize()
    return model_id


def match(sess, args):
    """Filter a discovered session against the requested scope."""
    if args.session and sess["id"] not in args.session:
        return False
    if args.branch and sess.get("branch") != args.branch:
        return False
    if args.project:
        cwd = sess.get("cwd") or ""
        if not cwd.startswith(str(args.project)):
            return False
    ts = (sess.get("timestamp") or "")[:10]
    if args.after and ts and ts < args.after:
        return False
    if args.before and ts and ts > args.before:
        return False
    return True


def scan_claude(args):
    """Claude: one JSONL per session, usage on each assistant message."""
    sessions = {}
    files = glob.glob(str(CLAUDE_ROOT / "*" / "*.jsonl"))
    files += glob.glob(str(CLAUDE_ROOT / "*" / "*" / "subagents" / "*.jsonl"))
    for fp in files:
        sess = None
        rows = []
        try:
            with open(fp) as fh:
                for line in fh:
                    try:
                        d = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if d.get("sessionId"):
                        # Metadata is spread across entries — the first line
                        # carrying sessionId is often a queue-operation with no
                        # cwd or branch, so fill each field as it first appears
                        # rather than locking in whatever line 0 happened to be.
                        if sess is None:
                            sess = {"id": d["sessionId"], "cwd": None, "branch": None,
                                    "timestamp": None, "provider": "claude"}
                        for key, field in (("cwd", "cwd"), ("branch", "gitBranch"),
                                           ("timestamp", "timestamp")):
                            if sess[key] is None and d.get(field):
                                sess[key] = d[field]
                    if d.get("type") != "assistant":
                        continue
                    msg = d.get("message", {})
                    model = claude_model(msg.get("model", ""))
                    if not model:
                        continue
                    u = msg.get("usage", {})
                    rows.append((model,
                                 u.get("input_tokens", 0),
                                 u.get("cache_creation_input_tokens", 0),
                                 u.get("cache_read_input_tokens", 0),
                                 u.get("output_tokens", 0)))
        except OSError as e:
            print(f"  warning: {fp}: {e}", file=sys.stderr)
            continue
        if not sess or not match(sess, args):
            continue
        agg = sessions.setdefault(sess["id"], {"meta": sess, "models": {}})
        for model, inp, cc, cr, out in rows:
            m = agg["models"].setdefault(model, [0, 0, 0, 0, 0])
            m[0] += inp; m[1] += cc; m[2] += cr; m[3] += out; m[4] += 1
    return sessions


def scan_codex(args):
    """Codex: rollout JSONL per session; token_count.total_token_usage is cumulative,
    so the last one wins rather than summing."""
    sessions = {}
    for fp in glob.glob(str(CODEX_ROOT / "**" / "*.jsonl"), recursive=True):
        sess, last = None, None
        try:
            with open(fp) as fh:
                for line in fh:
                    try:
                        d = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    p = d.get("payload", {})
                    if d.get("type") == "session_meta":
                        git = p.get("git") or {}
                        sess = {
                            "id": p.get("session_id") or p.get("id"),
                            "cwd": p.get("cwd"),
                            "branch": git.get("branch"),
                            "timestamp": p.get("timestamp"),
                            "provider": "codex",
                        }
                    elif p.get("type") == "token_count":
                        tot = (p.get("info") or {}).get("total_token_usage")
                        if tot:
                            last = tot
        except OSError as e:
            print(f"  warning: {fp}: {e}", file=sys.stderr)
            continue
        if not sess or not sess.get("id") or not match(sess, args) or not last:
            continue
        agg = sessions.setdefault(sess["id"], {"meta": sess, "models": {}})
        m = agg["models"].setdefault("Codex", [0, 0, 0, 0, 0])
        m[0] += last.get("input_tokens", 0)
        m[2] += last.get("cached_input_tokens", 0)
        m[3] += last.get("output_tokens", 0) + last.get("reasoning_output_tokens", 0)
        m[4] += 1
    return sessions


def fmt(n):
    return f"{n / 1_000_000:.1f}M" if n >= 1_000_000 else f"{n / 1_000:.0f}K"


def main():
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument("--branch")
    ap.add_argument("--project")
    ap.add_argument("--session", action="append", default=[])
    ap.add_argument("--sessions-file")
    ap.add_argument("--after")
    ap.add_argument("--before")
    ap.add_argument("--provider", choices=["claude", "codex", "all"], default="all")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("-h", "--help", action="store_true")
    args = ap.parse_args()

    if args.help or not any([args.branch, args.project, args.session,
                             args.sessions_file, args.after]):
        print(__doc__)
        return 0

    if args.project:
        args.project = Path(args.project).expanduser().resolve()
    if args.sessions_file:
        for line in Path(args.sessions_file).read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                args.session.append(json.loads(line)["session_id"])
            except (json.JSONDecodeError, KeyError):
                args.session.append(line)

    sessions = {}
    if args.provider in ("claude", "all"):
        sessions.update(scan_claude(args))
    if args.provider in ("codex", "all"):
        sessions.update(scan_codex(args))

    if not sessions:
        print("No matching sessions found.")
        return 0

    if args.list:
        print(f"{'provider':9} {'session':38} {'branch':28} started")
        for s in sorted(sessions.values(), key=lambda x: x["meta"].get("timestamp") or ""):
            m = s["meta"]
            print(f"{m['provider']:9} {m['id']:38} {(m.get('branch') or '-'):28} "
                  f"{(m.get('timestamp') or '')[:19]}")
        return 0

    totals = {}
    for s in sessions.values():
        for model, v in s["models"].items():
            t = totals.setdefault(model, [0, 0, 0, 0, 0])
            for i in range(5):
                t[i] += v[i]

    def row_total(model, v):
        # Codex counts cached input inside input_tokens; Claude does not.
        return v[0] + v[3] if model == "Codex" else v[0] + v[1] + v[2] + v[3]

    print("## Token Usage\n")
    print(f"_{len(sessions)} session(s)_"
          + (f", branch `{args.branch}`" if args.branch else "")
          + (f", after {args.after}" if args.after else "") + "\n")
    print("| Model | Input | Cache Create | Cache Read | Output | Total | Msgs |")
    print("|-------|------:|-------------:|-----------:|-------:|------:|-----:|")

    grand = grand_in = grand_out = 0
    order = ["Opus", "Sonnet", "Haiku", "Fable", "Codex"]
    for model in sorted(totals, key=lambda m: (order.index(m) if m in order else 99, m)):
        v = totals[model]
        tot = row_total(model, v)
        grand += tot
        grand_in += tot - v[3]
        grand_out += v[3]
        print(f"| {model} | {v[0]:,} | {v[1]:,} | {v[2]:,} | {v[3]:,} | {tot:,} | {v[4]} |")
    print(f"| **Total** | | | | | **{grand:,}** | |")

    compact = []
    for model in sorted(totals, key=lambda m: (order.index(m) if m in order else 99, m)):
        v = totals[model]
        label = model[0] if model != "Codex" else "Cx"
        compact.append(f"{label}:{fmt(row_total(model, v) - v[3])}in/{fmt(v[3])}out")
    print()
    print(f"**Compact:** {' '.join(compact)}")
    print(f"**Totals:** IN:{fmt(grand_in)} OUT:{fmt(grand_out)} ALL:{fmt(grand)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
