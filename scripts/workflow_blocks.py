"""Shared, conservative instruction-block handling for both Brief installers."""
import hashlib
import json
from pathlib import Path
import re
import sys
from datetime import datetime, timezone

CLOSE = "<!-- /brief:workflow -->"
ROOT = Path(__file__).resolve().parent.parent


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


def regions(text):
    """Return only real markers, never marker examples inside Markdown fences."""
    workflow, legacy, pending, fence = [], [], None, None
    offset = 0
    for line in text.splitlines(keepends=True):
        token = line.strip()
        fence_match = re.match(r"^ {0,3}(`{3,}|~{3,})", line)
        if fence_match:
            run = fence_match[1]
            if fence is None:
                fence = run
            elif run[0] == fence[0] and len(run) >= len(fence) and not line.strip()[len(run):].strip():
                fence = None
        elif fence is None:
            is_workflow = re.fullmatch(r'<!-- brief:workflow(?:\s+[^<>]*?)? -->', token)
            is_legacy = re.fullmatch(r'<!-- brief:auto\s+section="harness"(?:\s+[^<>]*?)? -->', token)
            if is_workflow or is_legacy:
                if pending:
                    raise ValueError("Nested Brief lifecycle markers; reconcile before updating")
                pending = ("workflow" if is_workflow else "legacy", offset, token)
            elif token == CLOSE or (token == "<!-- /brief:auto -->" and pending and pending[0] == "legacy"):
                if not pending or (token == CLOSE) != (pending[0] == "workflow"):
                    raise ValueError("Malformed Brief lifecycle markers; reconcile before updating")
                kind, start, opening = pending
                end = offset + len(line.rstrip("\r\n"))
                (workflow if kind == "workflow" else legacy).append((start, end, opening))
                pending = None
            elif token.startswith("<!-- brief:workflow") or token.startswith('<!-- brief:auto section="harness"'):
                raise ValueError("Malformed Brief lifecycle marker")
        offset += len(line)
    if pending or len(workflow) > 1 or len(legacy) > 1:
        raise ValueError("Unclosed or duplicate Brief lifecycle markers; reconcile before updating")
    return workflow, legacy


def canonical(block):
    lines = block.replace("\r\n", "\n").splitlines()
    return lines[0] + "\n" + "\n".join(lines[1:-1]).strip("\n") + "\n" + lines[-1]


def matches(block, expected):
    return block is not None and expected is not None and expected in (digest(block), digest(canonical(block)))


def body_of(block):
    return "\n".join(block.replace("\r\n", "\n").splitlines()[1:-1]).strip("\n")


def legacy_normalized(body):
    body = re.sub(r"(?m)^\s*```(?:text)?\s*$", "```", body)
    return re.sub(r"\s+", " ", body).strip()


def inspect(text, expected=None):
    workflow, legacy = regions(text)
    block = text[workflow[0][0]:workflow[0][1]] if workflow else None
    return {"block": block, "range": list(workflow[0][:2]) if workflow else None,
            "matches": matches(block, expected), "sha256": digest(canonical(block)) if block else None,
            "legacy": len(legacy)}


def integrate(text, body, version, expected=None):
    workflow, legacy = regions(text)
    current = text[workflow[0][0]:workflow[0][1]] if workflow else None
    body = body.strip("\r\n")
    if current and body_of(current) != body and not matches(current, expected):
        raise ValueError("Customized Brief workflow block; preserve and reconcile before updating")
    for start, end, _ in legacy:
        stock = json.loads((ROOT / "templates/legacy-harnesses.json").read_text())
        if legacy_normalized(body_of(text[start:end])) not in {legacy_normalized(item["content"]) for item in stock}:
            raise ValueError("Customized legacy Brief harness; preserve its choices and reconcile before consolidation")
    version = str(version)
    if not re.fullmatch(r"[A-Za-z0-9.+_-]+", version):
        raise ValueError("Invalid workflow version")
    opening = workflow[0][2] if workflow else ""
    attributes = dict(re.findall(r'([a-z]+)="([^"]*)"', opening))
    if current and body_of(current) == body and attributes.get("version") == version and attributes.get("updated"):
        block = current
    else:
        updated = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        block = f'<!-- brief:workflow version="{version}" updated="{updated}" -->\n\n{body}\n\n{CLOSE}'
    # Keep the existing workflow location, or replace the old harness in place. Every byte outside
    # these explicitly recognized regions is preserved, including other generated rule sections.
    target = workflow[0][:2] if workflow else (legacy[0][:2] if legacy else None)
    replacements = [(start, end, "") for start, end, _ in legacy if (start, end) != target]
    if target:
        replacements.append((*target, block))
        for start, end, replacement in sorted(replacements, reverse=True):
            text = text[:start] + replacement + text[end:]
    else:
        text += ("\n" if text.endswith("\n") else "\n\n") + block + "\n"
    return {"content": text, "block": block, "sha256": digest(canonical(block)), "consolidated": len(legacy)}


if __name__ == "__main__":
    try:
        args = json.load(sys.stdin)
        action = args.pop("action")
        result = inspect(**args) if action == "inspect" else integrate(**args)
        print(json.dumps(result))
    except (ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
