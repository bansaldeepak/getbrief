---
name: quality-check
description: Run quality checks on any project. Verifies compilation/typecheck, linting, tests, build, documentation sync, and error triage. Use after writing code or before committing. Project-level skills may extend with framework-specific checks.
---

# Quality Check

Run all quality checks for the current project. Adapt commands to the project's stack — read `package.json`, `Makefile`, `Cargo.toml`, `pyproject.toml`, or equivalent to discover the correct commands.

## Step 1: Discover Project Commands

Before running checks, identify the project's toolchain from its config files. Use the commands the project defines. Never assume commands — always verify.

## Step 2: Run Quality Gates (In Order)

### 2.1 Compile / Typecheck

| Stack | Command |
|-------|---------|
| TypeScript | `npm run typecheck` or `npx tsc --noEmit` |
| Go | `go build ./...` or `go vet ./...` |
| Rust | `cargo check` |
| Python | `mypy .` or `pyright` (if configured) |

### 2.2 Linting

| Stack | Command |
|-------|---------|
| TypeScript/JavaScript | `npm run lint` |
| Go | `golangci-lint run` |
| Rust | `cargo clippy -- -D warnings` |
| Python | `ruff check .` |

Must be 0 errors (warnings acceptable during adoption).

### 2.3 Tests

| Stack | Command |
|-------|---------|
| TypeScript/JavaScript | `npm test` or `npm run test:unit` |
| Go | `go test ./...` |
| Rust | `cargo test` |
| Python | `pytest` |

Report any failures and total count.

### 2.4 Build

| Stack | Command |
|-------|---------|
| TypeScript/JavaScript | `npm run build` |
| Go | `go build -o /dev/null ./...` |
| Rust | `cargo build` |

## Step 3: Coding Standards Audit

For each new or modified file, verify against the `coding-standards` skill:

- [ ] Exported functions/classes/types have doc comments
- [ ] Follows project naming conventions
- [ ] No type escape hatches (`any`, `interface{}`) without justifying comment
- [ ] No caught-and-swallowed errors
- [ ] No circular dependencies introduced
- [ ] Tests exist for new business logic

## Step 4: Documentation Sync Audit

Check if any changes affect how the project is understood or how future code should be written.

### What Triggers a Doc Sync

Any commit that introduces or changes:
- **Config files** — build, test, CI, linter configs
- **Commands or scripts** — new runnable commands, changed invocations
- **Patterns or conventions** — new coding patterns, architectural decisions
- **Project structure** — new directories, moved files, new module types
- **Architecture** — middleware order, data flow, auth flow, deployment
- **Skills or automation** — new or changed skills, hooks, workflow tooling
- **Dependencies** — new libraries, removed packages, version changes

### How to Sync

1. **Search for all references** — Grep project AGENTS.md, documentation directories, skill files (`.agents/skills/`), and memory files
2. **Update every reference** — Don't just update the primary doc. Update skills, rules docs, README tables, project structure descriptions — everything that mentions the affected area
3. **Include doc updates in the same commit** (or immediately following)

### Checklist

- [ ] **Project AGENTS.md** — Commands table, architecture section, conventions
- [ ] **Documentation directories** — Any doc referencing the changed area
- [ ] **Skills** (`.agents/skills/`) — Any skill referencing the changed pattern
- [ ] **Module/Provider READMEs** — If the module was modified
- [ ] **Memory files** — If persistent memories reference the changed area

## Step 5: Error Triage

**All errors — including pre-existing ones — must be triaged, not ignored.**

- **Zero-error policy** — Goal is 0 typecheck errors, 0 lint warnings, 0 test failures
- **Pre-existing errors** — Report them, ask for direction ("fix now or track as tech debt?"), never silently ignore
- **Fix forward** — If trivial to fix (< 5 min), propose fixing in the current PR
- **Track if deferred** — Create a backlog item or comment so it doesn't get lost

## Step 6: Report

```
## Quality Gate Results

| Check | Status | Details |
|-------|--------|---------|
| Typecheck | PASS/FAIL | N errors |
| Lint | PASS/FAIL | N errors, M warnings |
| Tests | PASS/FAIL | N passed, M failed, K total |
| Build | PASS/FAIL | Details |
| Standards | PASS/WARN | N issues found |
| Doc Sync | OK/NEEDED | List any stale docs |
```
