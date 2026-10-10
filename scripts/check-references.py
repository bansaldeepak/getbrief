#!/usr/bin/env python3
"""Validate maintained skill/agent/rule/template references; historical story prose is not executable policy."""
import argparse
from pathlib import Path
import re
import sys

EXTERNAL_SKILLS = {'gstack', 'plan-ceo-review', 'plan-eng-review'}
SKILL_REF = re.compile(r'`([a-z][a-z0-9-]{2,})`\s+skill|skill\s+`([a-z][a-z0-9-]{2,})`')
MD_LINK = re.compile(r'\[[^\]]+\]\((?!https?://|#|mailto:)([^)\s]+)\)')


def active_files(root):
    files = []
    for directory in ('skills/brief', 'agents', 'rules', 'templates', 'providers'):
        files.extend((root / directory).rglob('*.md'))
    for name in ('README.md', 'AGENTS.md'):
        if (root / name).exists():
            files.append(root / name)
    return sorted(set(files))


def validate(root):
    skills = {p.parent.name for p in (root / 'skills').rglob('SKILL.md')}
    skills |= {p.stem for p in (root / 'agents').glob('*.md')} | EXTERNAL_SKILLS
    problems = []
    if not (root / "skills/brief/SKILL.md").is_file():
        problems.append("missing canonical skills/brief/SKILL.md")
    files = active_files(root)
    for path in files:
        fence = None
        for number, line in enumerate(path.read_text().splitlines(), 1):
            marker = re.match(r'^\s*(`{3,}|~{3,})(.*)$', line)
            if marker:
                token, suffix = marker.groups()
                if fence is None:
                    fence = token
                elif token[0] == fence[0] and len(token) >= len(fence) and not suffix.strip():
                    fence = None
                continue
            if fence:
                continue
            for match in SKILL_REF.finditer(line):
                name = match.group(1) or match.group(2)
                if name not in skills:
                    problems.append(f'{path.relative_to(root)}:{number}: unknown skill {name}')
            for href in MD_LINK.findall(line):
                href = href.split('#', 1)[0]
                if not href or '<' in href or '>' in href:
                    continue
                if not (path.parent / href).exists():
                    problems.append(f'{path.relative_to(root)}:{number}: broken link {href}')
    return files, problems


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent.parent)
    args = parser.parse_args()
    root = args.root.resolve()
    files, problems = validate(root)
    for problem in problems:
        print(problem)
    print(f'Active reference check: {len(files)} files, {len(problems)} problems')
    return bool(problems)


if __name__ == '__main__':
    sys.exit(main())
