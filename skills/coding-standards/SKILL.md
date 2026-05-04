---
name: coding-standards
description: Language-agnostic coding standards. Auto-applies when writing code in any language. Enforces documentation comments, linting, formatting, testing, naming, type safety, error handling, structured logging, dependency management, and code reuse conventions.
---

# Global Coding Standards

Universal standards that apply to every project, regardless of language or framework. Project-level skills may extend these with framework-specific rules.

## 1. Documentation Comments (Mandatory on Exports)

**Every exported function, class, method, interface, and type must have a documentation comment.** Internal/private helpers and test files are exempt.

| Language | Format | Generator |
|----------|--------|-----------|
| TypeScript | TSDoc (`/** ... */`) | TypeDoc |
| JavaScript | JSDoc (`/** ... */`) | JSDoc |
| Go | GoDoc (comment above decl) | `go doc` |
| Rust | rustdoc (`///` or `//!`) | `cargo doc` |
| Python | docstrings (`"""..."""`) | Sphinx / mkdocstrings |

Required tags: description (always), `@param` / Args, `@returns` / Returns, `@throws` / Raises.

Exempt: internal/private functions, test files, React/UI components (`.tsx`/`.jsx`), one-line self-explanatory type aliases, barrel re-exports.

## 2. Linting (Mandatory)

| Language | Linter |
|----------|--------|
| TypeScript/JavaScript | ESLint (flat config preferred) |
| Go | `golangci-lint` |
| Rust | `clippy` |
| Python | `ruff` (preferred) or `flake8` + `pylint` |

- Must run in CI — lint errors must not merge
- Never disable rules inline without a justifying comment

## 3. Formatting (Mandatory)

| Language | Formatter |
|----------|-----------|
| TypeScript/JavaScript | Prettier |
| Go | `gofmt` / `goimports` |
| Rust | `rustfmt` |
| Python | `ruff format` (preferred) or `black` |

Format on save and on commit (pre-commit hook). Never override project formatting config.

## 4. Testing Conventions

- **Arrange-Act-Assert** pattern for every test
- **One behavior per test** — each test verifies exactly one thing
- **Descriptive test names** — reading the name tells you what behavior is verified
- **Mock at boundaries** — mock external dependencies, not internal logic
- **Test success AND error paths**
- **Deterministic** — no reliance on timing, ordering, or external state

| Language | Framework |
|----------|-----------|
| TypeScript/JavaScript | Vitest or Jest |
| Go | `testing` + `testify` |
| Rust | built-in `#[test]` |
| Python | `pytest` |

Co-located tests (`__tests__/`) for JS/TS/Go, mirror tree for Python/Java. Follow the project's existing convention.

## 5. Naming Conventions

| What | Convention |
|------|-----------|
| Functions/methods | `camelCase` (JS/TS/Java), `snake_case` (Python/Rust/Go) |
| Types/Classes | `PascalCase` |
| Constants | `UPPER_SNAKE_CASE` |
| Files (backend) | `kebab-case` (JS/TS) or `snake_case` (Python/Rust/Go) |
| Boolean vars | `is`/`has`/`can`/`should` prefix |

Follow the project's existing convention above all else. Naming should reveal intent.

## 6. Type Safety

- **Strictest mode available** — `strict: true` (TS), type hints (Python), strong typing everywhere
- **Avoid escape hatches** — no `any` (TS), no `unsafe` without justification (Rust)
- **Type-only imports** where supported (`import type` in TS)
- **Prefer generated types** over manual definitions (Prisma, protobuf, OpenAPI codegen)
- **Narrow types at boundaries** — validate external input, trust internal types

## 7. Error Handling

- **Never catch and swallow errors** — every catch must log, re-throw, or handle meaningfully
- **Use typed errors** — custom error classes (JS/TS), sentinel errors (Go), `Result<T, E>` (Rust)
- **Validate at system boundaries** — user input, API responses, env vars. Trust internal code.
- **Fail fast** — fail immediately with a clear message, don't silently continue with bad state
- **Log context** — include operation, relevant IDs, and input that caused the failure

## 8. Code Organization

- **Single responsibility** — each file/module does one thing well
- **No circular dependencies** — if A imports B, B must not import A
- **Explicit exports** — barrel files list what's public
- **Co-locate related code** — tests next to source, types next to usage
- **Prefer flat over nested** — avoid deep nesting (>3 levels)

## 9. Structured Logging

**Never use raw `console.log`/`console.error` in production code.** Use a structured logger.

- **Use the project's logger** — pino, winston, Sentry.logger, etc.
- **Structured data, not string interpolation** — `logger.info({ vertical, chatId }, "webhook received")`
- **Log levels** — `debug` (dev only), `info` (key events), `warn` (recoverable), `error` (failures)
- **No sensitive data in logs** — never log tokens, secrets, passwords, PII
- **Console is OK in tests** — this rule applies to application code only

## 10. Dependency & Package Versions

**Always use pinned versions from the project's package manifest.** Never suggest or install newer versions unless the user asks or a security patch requires it.

1. **Read the project's package file first** — `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.
2. **Use documentation matching the pinned version** — not "latest"
3. **Never add a new dependency without asking** — propose it, explain alternatives, let the user decide

## 11. Code Reuse & Modularity

- **DRY at 2 occurrences** — same logic in 2+ places → extract to shared utility
- **Pure functions first** — input → output, no side effects. Keep side effects at the edges.
- **Barrel exports** — every module/provider directory has an `index.ts` re-exporting the public API
- **Layered architecture** — handlers → services → providers. Don't mix layers.
- **Small files** — if a file exceeds ~200 lines, split by responsibility
