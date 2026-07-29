---
name: backend-standards
description: Framework-agnostic backend architecture standards. Auto-applies when writing server code — API routes, handlers, controllers, services, repositories, or data access. Enforces layer contracts, module structure, resource naming, status-code semantics, response envelopes, boundary validation, transaction ownership, and pagination. Extends coding-standards; framework and ORM specifics live in project skills.
---

# Backend Standards

Architecture rules for server code in any language or framework. File-size limits, reuse, error handling, logging, and type safety come from `coding-standards`; destructive database operations and migration safety come from `db-safety`; instrumentation — error reporting, tracing, correlation IDs, analytics emission — comes from `observability`. This skill covers only what is specific to building services and APIs.

## 1. Layer Contracts

Three layers, each with one job. The contract is what a layer is allowed to *know*, and it is what keeps handlers from growing into 3,000-line files.

| Layer | Owns | Must never |
|-------|------|-----------|
| **Handler / route** | Transport — parse, validate, authorize, call one service, shape the response | Contain business rules or touch the database directly |
| **Service** | Business logic, orchestration, transaction boundaries | Reference request/response objects, HTTP status codes, or headers |
| **Provider / repository** | One external system — DB, queue, third-party API | Contain business rules, or know which feature called it |

**A service that imports the transport type is broken.** That single rule is what makes services testable without spinning up a server, and it is the most commonly violated one — take the parsed values as arguments, return plain data, let the handler translate.

Handlers should read as a short list of steps. Past ~30 lines, the handler is doing a service's job.

## 2. Module Structure

Group by feature, never by technical type. `modules/invoices/` — not `controllers/`, `services/`, `models/` spread across the tree.

```
modules/<feature>/
  README.md      # purpose, concepts, key files, design decisions
  index.*        # barrel — the module's entire public surface
  routes.*       # handlers
  service.*      # business logic
  schemas.*      # request/response schemas + inferred types
  __tests__/     # service tests
```

- **Sub-modules** for related concerns under one domain — same shape, re-exported from the parent barrel.
- **Split route files by auth context** when a module serves several — `admin-routes`, `public-routes` — rather than branching on role inside one handler.
- **Providers get their own directory** with `types`, `client`, `index`, and a README documenting the external contract and required env vars.
- **The README is updated in the same commit as the change.** A stale README is worse than none.

## 3. API Design

| Rule | Bad | Good |
|------|-----|------|
| Plural resource nouns | `/user/:id` | `/users/:id` |
| No verbs in paths | `/getUsers`, `/createOrder` | `GET /users`, `POST /orders` |
| Kebab-case segments | `/chatStyles` | `/chat-styles` |
| Nest to express ownership | `/order/:id/getItems` | `GET /orders/:id/items` |
| Filters are query params | `/users/active` | `/users?status=active` |

Nest at most one level deep — past that, the child is its own top-level resource. Actions that genuinely aren't CRUD get a sub-resource (`POST /orders/:id/refunds`), not a verb path.

### Status codes

| Code | When |
|------|------|
| `200` | Successful GET, PUT, PATCH, DELETE |
| `201` | Resource created — include its identifier |
| `202` | Accepted for async processing |
| `204` | Success with no body |
| `400` | Malformed request or validation failure |
| `401` | Missing or invalid authentication |
| `403` | Authenticated, but not permitted |
| `404` | Resource does not exist, or must not be revealed to this caller |
| `409` | Conflict — duplicate, version mismatch, invalid state transition |
| `422` | Well-formed but semantically invalid, where the framework distinguishes it from `400` |
| `429` | Rate limited |
| `500` | Unexpected server error — never returned deliberately |

**Never return `200` with an error in the body.** Clients, proxies, and monitoring all key off the status.

### Response envelope

One shape across the whole API, chosen once and never varied:

```
{ data: T }                                                    // single resource
{ data: T[], pagination: { page, limit, total, totalPages } }  // collection
{ error: { message, code?, details? }, timestamp, path }       // failure
```

Error messages are for humans; `code` is the stable string clients branch on. Never leak stack traces, SQL, or internal paths to a caller.

## 4. Validation at the Boundary

- **Schema-first.** Declare a schema per input (body, query, params) and infer the type from it. Never hand-write a type alongside its schema — they drift, and the type wins at compile time while the schema wins at runtime.
- **Validate every external input**: request payloads, query strings, webhook bodies, third-party responses, and environment variables at startup.
- **Coerce explicitly.** Query and path params arrive as strings; conversion belongs in the schema, not scattered through the handler.
- **Trust internal callers.** Re-validating between your own layers is noise.
- **Validate env at boot, not at use** — a missing variable should kill the process on start, not fail one request at 3am.

## 5. Persistence

- **Only providers/repositories touch the ORM or SQL.** A query in a handler is a layering violation.
- **The service owns the transaction.** It decides what is atomic; repositories accept a transaction handle and never open one themselves.
- **Every list endpoint is paginated** — no unbounded `findMany`. Default and maximum page size are explicit constants.
- **Watch for N+1** — fetch relations in one query, or batch. Loops issuing queries are the default cause of slow endpoints.
- **Map persistence errors to domain errors in the provider.** Unique-constraint and not-found codes become typed errors there; handlers translate those to HTTP. Handlers must never inspect raw driver error codes.
- Migrations and any destructive operation follow `db-safety` — no exceptions.

## 6. Auth & Safety

- **Authorize in the handler, before the service call**, so the check is visible at the entry point rather than buried in business logic.
- **Deny by default** — a route is protected unless explicitly marked public.
- **Never trust a client-supplied identity field.** The subject comes from the verified token, never from the body.
- **Make writes idempotent where retries are possible** — webhooks, payments, queue consumers. Accept an idempotency key or dedupe on a natural one.
- **Rate-limit public and auth endpoints.**

## 7. Testing

- **Services are unit-tested with the persistence layer mocked** — that's the layer holding the logic worth asserting.
- **Assert the call, not just the return** — that the repository was invoked with the right arguments is usually the actual behavior.
- **Test error paths and boundary conditions**, especially conflicts and not-found.
- **Handlers get integration tests** covering status codes, validation rejection, and auth — happy paths alone prove nothing about a handler.
- Fixtures come from factory helpers with stable identifiers; no inline hardcoded UUIDs.

## 8. What Belongs in a Project Skill Instead

Push anything true of only one repo to a project-level `.claude/skills/` skill:

- The web framework and its routing idiom
- The ORM/query builder and generated-type conventions
- The validation library and its helpers
- Test runner configuration and mock factories
- Deployment target specifics, background jobs, queues

## Rules

- Handlers do transport, services do logic, providers do I/O — no layer skips or reverses
- A service that imports a request/response type is broken
- Group modules by feature; the barrel is the module's whole public surface
- Every external input is schema-validated at the boundary; types are inferred from schemas
- Every list endpoint is paginated with an explicit maximum
- The service owns transactions; repositories never open their own
- Authorize at the entry point, deny by default, never trust a client-sent identity
- One response envelope across the API; never `200` with an error body
