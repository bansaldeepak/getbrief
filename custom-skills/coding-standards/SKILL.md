---
name: coding-standards
description: Language-agnostic coding standards. Auto-applies when writing code in any language. Enforces file-size limits and modularity, code reuse, documentation comments, linting, formatting, testing, naming, type safety, error handling, structured logging, and dependency management.
---

# Global Coding Standards

Universal standards that apply to every project, regardless of language or framework. Framework and stack skills extend these — they must never restate them.

## 1. Modularity & File Size (Enforced)

**A file that outgrows its limit is a design defect, not a style preference.** Large files hide duplication, defeat review, and make every future change riskier than it needs to be.

### Limits

| File type | Review at | Split at |
|-----------|----------:|---------:|
| UI component | 150 | 250 |
| Route / controller / handler | 150 | 250 |
| Service / business logic | 200 | 300 |
| Utility / helper module | 150 | 200 |
| Type / schema definitions | 300 | 500 |
| Test file | 300 | 500 |
| Generated code (Prisma, protobuf, OpenAPI) | — | exempt |

Function-level limits, all languages: **50 lines per function**, **4 parameters** (past that, take an options object), **3 levels of nesting**.

**Review at** = justify it in the PR or split it. **Split at** = split it; "I'll clean it up later" is not a justification. When a file is already over the limit before you touch it, you are not obliged to fix the whole file — but you must not add to it. Extract your addition instead.

### How to split

"Split by responsibility" is only actionable if you can name the responsibility. Work down this list and stop at the first one that yields a name:

1. **Extract pure helpers** — anything with no dependency on the file's state goes to a sibling `*-utils` / `*_helpers` module.
2. **Extract types and schemas** — move to `types.*` / `schemas.*` in the same directory.
3. **Extract constants and config** — lookup tables, defaults, enums.
4. **Extract a cohesive sub-behavior** — a group of functions sharing a noun becomes its own module with a barrel export.
5. **Split by consumer** — if half the file serves one caller and half serves another, that seam is the split.

**Never split on line count alone.** A 260-line file with one job is healthier than two 130-line files that must be read together. If no seam has a name, the file is telling you the responsibility itself is wrong — fix that first.

### Enforcement

Lint config must carry these, warn at the review threshold and error at the split threshold:

```jsonc
// ESLint (adjust per-glob for the table above)
"max-lines": ["error", { "max": 300, "skipBlankLines": true, "skipComments": true }],
"max-lines-per-function": ["error", { "max": 50, "skipBlankLines": true }],
"max-params": ["warn", 4],
"max-depth": ["error", 3],
"complexity": ["warn", 10]
```

Equivalents: `golangci-lint` (`funlen`, `gocognit`, `nestif`), `clippy` (`too_many_lines`, `too_many_arguments`, `cognitive_complexity`), `ruff` (`PLR0913`, `PLR0912`, `C901`).

Code review checks file size and duplication explicitly — a passing typecheck and green tests say nothing about either.

## 2. Code Reuse

- **Extract at the second use — when both copies share a reason to change.** Two snippets that merely look alike are not duplication; coupling them creates a worse problem than the one you solved. Same shape, different reason → leave them alone.
- **Pure functions first** — input → output, no side effects. Keep side effects at the edges.
- **Explicit public API** — every module directory has a barrel (`index.*`) naming exactly what's public. Everything else is internal.
- **Layered** — handlers → services → providers. Never call downward past a layer, never call upward.
- **No circular dependencies** — if A imports B, B must not import A.
- **Co-locate** — tests next to source, types next to usage.
- **Prefer flat over nested** — directory nesting beyond 3 levels needs a reason.

## 3. Documentation Comments (Mandatory on Exports)

**Every exported function, class, method, interface, and type must have a documentation comment.** Internal/private helpers and test files are exempt.

| Language | Format | Generator |
|----------|--------|-----------|
| TypeScript | TSDoc (`/** ... */`) | TypeDoc |
| JavaScript | JSDoc (`/** ... */`) | JSDoc |
| Go | GoDoc (comment above decl) | `go doc` |
| Rust | rustdoc (`///` or `//!`) | `cargo doc` |
| Python | docstrings (`"""..."""`) | Sphinx / mkdocstrings |

Required tags: description (always), `@param` / Args, `@returns` / Returns, `@throws` / Raises.

Exempt: internal/private functions, test files, UI components, one-line self-explanatory type aliases, barrel re-exports.

## 4. Linting (Mandatory)

| Language | Linter |
|----------|--------|
| TypeScript/JavaScript | ESLint (flat config preferred) |
| Go | `golangci-lint` |
| Rust | `clippy` |
| Python | `ruff` (preferred) or `flake8` + `pylint` |

- Must run in CI — lint errors must not merge
- Never disable rules inline without a justifying comment

## 5. Formatting (Mandatory)

| Language | Formatter |
|----------|-----------|
| TypeScript/JavaScript | Prettier |
| Go | `gofmt` / `goimports` |
| Rust | `rustfmt` |
| Python | `ruff format` (preferred) or `black` |

Format on save and on commit (pre-commit hook). Never override project formatting config.

## 6. Testing Conventions

- **Arrange-Act-Assert** pattern for every test
- **One behavior per test** — each test verifies exactly one thing
- **Descriptive test names** — reading the name tells you what behavior is verified
- **Mock at boundaries** — mock external dependencies, not internal logic
- **Test success AND error paths**
- **Deterministic** — no reliance on timing, ordering, or external state
- **A cast to make a test compile means the test asserts nothing** — `as never`/`as any`/`@ts-expect-error`, or the language's equivalent, is the tell. Once the type system has forgotten a thing, a runtime test cannot meaningfully remember it: it asserts a property of *unrecognised input in general*, wearing a specific name.
- **Delete a feature's tests with the feature.** A test named after a removed symbol guards nothing, keeps the name alive in live code, and defeats the `grep` meant to prove the removal is complete. The general case that replaces it is usually already covered.

| Language | Framework |
|----------|-----------|
| TypeScript/JavaScript | Vitest or Jest |
| Go | `testing` + `testify` |
| Rust | built-in `#[test]` |
| Python | `pytest` |

Co-located tests (`__tests__/`) for JS/TS/Go, mirror tree for Python/Java. Follow the project's existing convention.

## 7. Naming Conventions

| What | Convention |
|------|-----------|
| Functions/methods | `camelCase` (JS/TS/Java), `snake_case` (Python/Rust/Go) |
| Types/Classes | `PascalCase` |
| Constants | `UPPER_SNAKE_CASE` |
| Files (backend) | `kebab-case` (JS/TS) or `snake_case` (Python/Rust/Go) |
| Boolean vars | `is`/`has`/`can`/`should` prefix |

Follow the project's existing convention above all else. Naming should reveal intent.

## 8. Type Safety

- **Strictest mode available** — `strict: true` (TS), type hints (Python), strong typing everywhere
- **Avoid escape hatches** — no `any` (TS), no `unsafe` without justification (Rust)
- **Type-only imports** where supported (`import type` in TS)
- **Prefer generated types** over manual definitions (Prisma, protobuf, OpenAPI codegen)
- **Narrow types at boundaries** — validate external input, trust internal types

## 9. Error Handling

- **Never catch and swallow errors** — every catch must log, re-throw, or handle meaningfully
- **Use typed errors** — custom error classes (JS/TS), sentinel errors (Go), `Result<T, E>` (Rust)
- **Validate at system boundaries** — user input, API responses, env vars. Trust internal code.
- **Fail fast** — fail immediately with a clear message, don't silently continue with bad state
- **Log context** — include operation, relevant IDs, and input that caused the failure

## 10. Structured Logging

**Never use raw `console.log`/`console.error` in production code.** Use a structured logger.

- **Use the project's logger** — pino, winston, Sentry.logger, etc.
- **Structured data, not string interpolation** — `logger.info({ vertical, chatId }, "webhook received")`
- **Log levels** — `debug` (dev only), `info` (key events), `warn` (recoverable), `error` (failures)
- **No sensitive data in logs** — never log tokens, secrets, passwords, PII
- **Console is OK in tests** — this rule applies to application code only

Wiring a logger, error reporter, tracer, or analytics SDK — and what redaction, correlation, and flushing they require — is the `observability` skill.

## 11. Dependency & Package Versions

**Always use pinned versions from the project's package manifest.** Never suggest or install newer versions unless the user asks or a security patch requires it.

1. **Read the project's package file first** — `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.
2. **Use documentation matching the pinned version** — not "latest"
3. **Never add a new dependency without asking** — propose it, explain alternatives, let the user decide
