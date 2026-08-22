# Project Instructions

Shared agent instructions for this repository. All AI agents (Claude, Codex, Gemini)
follow these rules when working in this codebase.

## Project Overview

<!-- One paragraph: what this project is, its primary language/framework, deployment target. -->

## Architecture

<!-- High-level structure: key directories, layers, data flow. Keep under 20 lines. -->

## Conventions

<!-- Coding standards, naming, file organization patterns specific to this project. -->

## Development

<!-- How to run, test, build. Commands an agent needs to do its job. -->

```bash
# Install
# Test
# Build
# Dev server
```

## Constraints

<!-- Non-obvious rules: "never import X from Y", "all DB changes need migration", etc. -->

## Project Structure

```
MEMORY.md              # memory index (brief search is primary read path)
documentation/
  tracker.yaml         # structured source of truth for all items
  PROJECT-TRACKER.md   # generated — active items only
  stories/             # feature folders (PRD, TRD, story, tasks)
  decisions/           # DEC-NNN.md files
  todo/                # TODO-NNN.md files
  logs/                # one file per log entry
  memory/              # agent memory files
  context/             # graduated cross-cutting knowledge
```
