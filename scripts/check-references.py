#!/usr/bin/env python3
"""Verify that everything the config points at actually exists.

The 2026-07-29 audit found six live references to things that had been renamed
or deleted — a CLAUDE.md section never written, a skill path that was never
right, an override path naming the wrong directory *and* the wrong skill,
command names that are not invocable. Every one survived months because nothing
checks. Renaming a skill silently orphans every mention of its old name.

Checks three reference kinds, all high-signal and low-false-positive:

  1. `<name>` skill  /  skill `<name>`   -> a skill by that name must exist
  2. ~/.agents/<path>                    -> the path must exist
  3. [text](relative/path)               -> the target must exist

Exits non-zero on any miss so it can gate a pre-commit hook or CI.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Skills owned by other tooling, referenced by name but not ours to resolve.
EXTERNAL_SKILLS = {
    "gstack", "plan-ceo-review", "plan-eng-review",
    # installed by the `skills` CLI into skills/, linked by hand
    "shadcn-ui",
    # names a *project* skill is expected to provide, by design
    "hono-react-router-prisma", "new-module", "product-analytics",
}

# Directories that are not ours to validate.
SKIP_DIRS = {"skills", ".git", "node_modules", "concepts", "templates"}

SKILL_REF = re.compile(r"`([a-z][a-z0-9-]{2,})`\s+skill|skill\s+`([a-z][a-z0-9-]{2,})`")
HOME_PATH = re.compile(r"~/\.agents/([A-Za-z0-9._/-]+)")
MD_LINK = re.compile(r"\[[^\]]+\]\((?!https?://|#|mailto:)([^)\s]+)\)")


def known_skills():
    names = set()
    for skill in ROOT.glob("custom-skills/*/SKILL.md"):
        names.add(skill.parent.name)
    for skill in ROOT.glob("custom-skills/*/*/SKILL.md"):
        names.add(skill.parent.name)
    for agent in ROOT.glob("agents/*.md"):
        names.add(agent.stem)
    return names


def markdown_files():
    for path in ROOT.rglob("*.md"):
        rel = path.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in rel.parts):
            continue
        yield path


def main():
    skills = known_skills() | EXTERNAL_SKILLS
    problems = []

    for path in markdown_files():
        rel = path.relative_to(ROOT)
        try:
            text = path.read_text()
        except (OSError, UnicodeDecodeError):
            continue

        # Fenced blocks hold templates and how-to examples — `my-skill` and
        # `documentation/stories/<feature>/` are illustrations, not references.
        in_fence = False
        for lineno, line in enumerate(text.splitlines(), 1):
            if line.lstrip().startswith("```"):
                in_fence = not in_fence
                continue
            if in_fence:
                continue

            for match in SKILL_REF.finditer(line):
                name = match.group(1) or match.group(2)
                if name not in skills:
                    problems.append(f"{rel}:{lineno}  unknown skill `{name}`")

            for match in HOME_PATH.finditer(line):
                if "<" in match.group(1):
                    continue
                target = ROOT / match.group(1)
                if not target.exists():
                    problems.append(f"{rel}:{lineno}  missing path ~/.agents/{match.group(1)}")

            for match in MD_LINK.finditer(line):
                href = match.group(1).split("#", 1)[0]
                if not href or "<" in href:
                    continue
                if not (path.parent / href).exists():
                    problems.append(f"{rel}:{lineno}  broken link -> {href}")

    if problems:
        print(f"Reference check: {len(problems)} problem(s)")
        for p in problems:
            print(f"  ✗ {p}")
        print("\nRenaming or deleting a skill is a repo-wide event — fix every mention.")
        return 1

    print(f"Reference check: OK — {len(list(markdown_files()))} files, "
          f"{len(skills - EXTERNAL_SKILLS)} skills resolve")
    return 0


if __name__ == "__main__":
    sys.exit(main())
