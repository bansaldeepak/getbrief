---
description: Language-agnostic coding standards — modularity, file-size limits, code reuse, naming, type safety, error handling.
---

# Coding Standards

Universal standards for every project. Framework skills extend these — never restate them.

## Modularity & File Size

| File type | Review at | Split at |
|-----------|----------:|---------:|
| UI component | 150 | 250 |
| Route / controller / handler | 150 | 250 |
| Service / business logic | 200 | 300 |
| Utility / helper module | 150 | 200 |
| Type / schema definitions | 300 | 500 |
| Test file | 300 | 500 |
| Generated code | — | exempt |

Function limits: **50 lines**, **4 parameters**, **3 nesting levels**.

**Review at** = justify or split. **Split at** = split unconditionally. Never split on line count alone — a 260-line file with one job beats two 130-line files that must be read together.

## Code Reuse

- Extract at the second use — only when both copies share a reason to change
- Pure functions first; side effects at the edges
- Layered: handlers → services → providers (never skip or invert)
- No circular dependencies
- Co-locate tests next to source
- Prefer flat over nested (3 levels max)

## Naming

| What | Convention |
|------|-----------|
| Functions/methods | `camelCase` (JS/TS), `snake_case` (Python/Rust/Go) |
| Types/Classes | `PascalCase` |
| Constants | `UPPER_SNAKE_CASE` |
| Booleans | `is`/`has`/`can`/`should` prefix |

Follow the project's existing convention above all else.

## Type Safety

- Strictest mode available (`strict: true`, type hints everywhere)
- No escape hatches (`any`, `unsafe`) without justification
- Prefer generated types over manual definitions
- Narrow types at boundaries; trust internal types

## Error Handling

- Never catch and swallow — every catch must log, re-throw, or handle meaningfully
- Use typed errors (custom classes, sentinel errors, `Result<T, E>`)
- Validate at system boundaries only; trust internal code
- Fail fast with clear messages; never continue with bad state
- Log context: operation, relevant IDs, input that caused the failure

## Testing

- Arrange-Act-Assert, one behavior per test
- Mock at boundaries, not internal logic
- Test success AND error paths
- Deterministic — no timing/ordering/external-state reliance
- Delete a feature's tests with the feature

## Dependencies

- Always use pinned versions from the project manifest
- Never add a dependency without asking — propose it, explain alternatives
