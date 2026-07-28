---
name: hono-react-router-prisma-stack
description: Stack conventions for Hono + React Router + Prisma projects. Auto-applies when working on TypeScript projects using Hono API backend, React Router frontend, and Prisma ORM. Covers route patterns, service layer, Zod validation, testing, and frontend conventions.
---

# Hono + React Router + Prisma Stack

Stack-specific conventions for projects using Hono (backend API), React Router (frontend SSR), and Prisma (ORM). These extend the global coding standards with framework-specific patterns.

## Architecture

- **Single Worker / Server**: Hono handles `/api/*` routes, React Router handles everything else (SSR)
- **Backend**: `app/server/` — Hono, flat feature modules, Prisma ORM, Zod validation, OpenAPI docs
- **Frontend**: `app/client/` — React Router, auth provider, analytics, `hc<AppType>` RPC client
- **Shared**: `app/shared/` — environment-agnostic types/utils
- **Path aliases**: `@frontend/*`, `@backend/*`, `@shared/*`
- **Code isolation**: Frontend never imports `@backend/*`; backend never imports `@frontend/*`

## Route Pattern — Hono (Required)

Every module uses **Hono functional routes** with method chaining. No class-based controllers.

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import type { AppContext } from "../../shared/types/context.js";
import { clerkAuth } from "../../shared/middleware/clerk.js";
import { createSchema, idParamSchema } from "./schemas.js";
import * as service from "./service.js";

const routes = new Hono<AppContext>()
  .get("/", clerkAuth, zValidator("query", paginationSchema), async (c) => {
    const prisma = c.get("prisma");
    const result = await service.list(prisma);
    return c.json({ data: result });
  })
  .post("/", clerkAuth, zValidator("json", createSchema), async (c) => {
    const prisma = c.get("prisma");
    const data = c.req.valid("json");
    const item = await service.create(prisma, data);
    return c.json({ data: item }, 201);
  });

export default routes;
export type RoutesType = typeof routes;
```

**Required**: `new Hono<AppContext>()`, method chaining, auth middleware per route, `zValidator()`, export `typeof`.

## Service Layer — Functional Exports

```typescript
import type { PrismaClient } from "../../../generated/prisma/client.js";

export async function create(prisma: PrismaClient, data: CreateInput) {
  return prisma.resource.create({ data });
}
```

Services: NO `req`/`res`, `PrismaClient` as first param, use Prisma generated types.

## Zod Schemas — Type Inference

```typescript
import { z } from "zod";

export const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
});

export type CreateInput = z.infer<typeof createSchema>;
```

**Always** infer types with `z.infer<>` — never define types separately from schemas. Query params are strings — use `.transform()` for number conversion.

## Module File Structure

```
app/server/modules/<name>/
  README.md      # Module overview, concepts, design decisions (REQUIRED)
  index.ts       # Re-exports routes
  routes.ts      # Hono route definitions
  service.ts     # Business logic (PrismaClient as first param)
  schemas.ts     # Zod schemas + inferred types
  __tests__/     # Service unit tests
```

### Sub-module Variant

For related concerns under a parent module:

```
app/server/modules/<parent>/
  index.ts       # Re-exports own routes + sub-module routes
  routes.ts      # Parent routes
  <child>/       # Sub-module with same structure (index, routes, service, schemas, __tests__/)
```

### Route File Naming (Multi-Auth Modules)

When a module serves different auth contexts:
- `admin-routes.ts` — requires admin auth
- `customer-routes.ts` — requires user auth
- `public-routes.ts` — no auth
- `index.ts` — re-exports all routes

### Provider Structure

```
app/server/providers/<name>/
  README.md      # Provider overview, usage examples, external API docs links (REQUIRED)
  types.ts       # Interface definitions
  client.ts      # Client factory / implementation
  index.ts       # Barrel export
```

### Module & Provider README (Required)

Every module and provider directory **must** have a `README.md`. This is a living document updated whenever the module changes.

**Module README must include:**
- Purpose — one-line summary of what the module does
- Concepts — key domain terms and their meanings
- Key files — table of files with purpose
- Architecture — how data flows through the module
- Design decisions — why things are built this way (not just what)
- Related documentation — links to application docs, stories, external resources

**Provider README must include:**
- Purpose — what external service it wraps
- Stack — packages used and how they connect
- Usage — code example showing how to create and use the client
- Environment variables — table of required/optional vars
- Design decisions — why this approach was chosen
- External documentation — links to vendor API docs, SDK repos, integration guides
- Related — links to consuming modules and application docs

**Maintenance rule:** When a module or provider is modified, its README must be reviewed and updated in the same commit (or immediately after). Stale READMEs are worse than no READMEs.

## Response Format

```typescript
{ data: T }                                                      // Single resource
{ data: T[], pagination: { page, limit, total, totalPages } }    // Collection
{ error: { message, code?, details? }, timestamp, path }         // Error
```

### Status Codes

| Code | When |
|------|------|
| `200` | Successful GET, PUT, PATCH, DELETE |
| `201` | Successful POST (resource created) |
| `400` | Validation failure, malformed request |
| `401` | Missing or invalid authentication |
| `403` | Authenticated but insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict (duplicate, e.g., Prisma P2002) |
| `500` | Unexpected server error |

## Error Handling

```typescript
import { HTTPException } from "hono/http-exception";

// Not found
throw new HTTPException(404, { message: "User not found" });

// Prisma P2002 (unique constraint)
throw new HTTPException(409, { message: "Resource already exists" });

// Prisma P2025 (record not found)
throw new HTTPException(404, { message: "Resource not found" });
```

Never catch and swallow errors. Let unknown errors propagate to global handler.

## TypeScript Rules

- `strict: true` — all code must pass
- Use `import type` for type-only imports
- Use `unknown` not `any` — narrow with type guards
- Use Prisma generated types, never manually define DB types
- Never `@ts-ignore` — use `@ts-expect-error` with comment
- Never import `@backend/*` from frontend or vice versa
- Never use `!` (non-null assertion) without clear justification
- Never use `var` — use `const` by default, `let` only when needed

### Import Order

```typescript
// 1. Third-party packages
import { Hono } from "hono";
import { z } from "zod";

// 2. Shared/internal modules
import type { AppContext } from "../../shared/types/context.js";
import { clerkAuth } from "../../shared/middleware/clerk.js";

// 3. Local module imports
import * as service from "./service.js";
import { createSchema } from "./schemas.js";
```

## Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Files (backend) | `kebab-case.ts` | `routes.ts`, `service.ts` |
| Files (frontend) | `PascalCase.tsx` | `Dashboard.tsx` |
| Hooks | `camelCase.ts` | `useAuth.ts` |
| Functions/vars | `camelCase` (verb-first) | `createUser()` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_PAGE_SIZE` |
| Types/Interfaces | `PascalCase` | `CreateUserInput` |
| Enums (Prisma) | `PascalCase` | `UserRole` |
| Route paths | `/kebab-case/plural-nouns` | `/items/:id/details` |
| Booleans | `is/has/can` prefix | `isDeleted` |
| Generic params | Single uppercase letter | `Hono<T>` |

### API Route Rules

| Rule | Bad | Good |
|------|-----|------|
| Plural nouns | `/user/:id` | `/users/:id` |
| No verbs in URL | `/getUsers` | `GET /users` |
| Kebab-case paths | `/chatStyles` | `/chat-styles` |
| Nested resources | `/order/:id/getItems` | `/orders/:id/items` |

## Documentation Comments (TSDoc)

All **exported** functions, interfaces, types, and classes in `app/server/`, `app/shared/`, and `app/client/**/*.ts` (non-JSX) must have TSDoc comments. React components (`.tsx` files) and test files are exempt.

### TSDoc Format

```typescript
/**
 * Brief description of what this function does.
 *
 * @param prisma - Prisma client instance.
 * @param userId - Clerk user ID of the authenticated user.
 * @returns The user record, or null if not found.
 */
export async function getUser(
  prisma: PrismaClient,
  userId: string,
) { ... }
```

### What Requires Docs

| Symbol | Required |
|--------|----------|
| Exported function | Yes — `@param` for each parameter |
| Exported interface/type | Yes — description |
| Exported Zod schema | Yes — one-line description |
| Internal/private functions | No (nice to have) |
| React components (`.tsx`) | No |
| Test files | No |
| Re-exports / barrel files | No |

### Enforcement

- **ESLint**: `eslint-plugin-jsdoc` + `eslint-plugin-tsdoc` enforce docs on server+shared exports (warn level)
- **TypeDoc**: `npm run docs:typedoc` generates markdown from TSDoc comments
- **CI**: `npm run lint` must pass with 0 errors (warnings are advisory)

## Testing

Two vitest configs:

| Config | Pool | Purpose | Command |
|--------|------|---------|---------|
| `vitest.config.ts` | `@cloudflare/vitest-pool-workers` | Integration tests (Workers runtime) | `npm test` |
| `vitest.unit.config.ts` | Node (default) | Service unit tests (mocked Prisma) | `npm run test:unit` |

### Service Unit Tests

Required for every module with a `service.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { createMockPrisma } from "@backend/__tests__/helpers/prisma-mock.js";
import { IDS, makeEntity } from "@backend/__tests__/helpers/fixtures.js";
import { listEntities } from "../service.js";

describe("listEntities", () => {
  it("returns paginated results", async () => {
    const entity = makeEntity();
    const prisma = createMockPrisma({
      entity: {
        findMany: vi.fn().mockResolvedValue([entity]),
        count: vi.fn().mockResolvedValue(1),
      },
    });

    const result = await listEntities(prisma, 1, 10);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
```

### Testing Rules

- Test file: `app/server/modules/<name>/__tests__/<name>-service.test.ts`
- Mock Prisma with `createMockPrisma()` — no external mocking libs
- Use factory functions from `fixtures.ts` — no inline hardcoded UUIDs
- Arrange-Act-Assert, one behavior per test
- Verify both return values AND Prisma call arguments
- Test success and error paths
- For `$transaction`: mock with `vi.fn().mockImplementation((fn) => fn(txMock))`

### Test Helpers

```
app/server/__tests__/helpers/prisma-mock.ts   # Proxy-based mock factory
app/server/__tests__/helpers/fixtures.ts      # Stable UUIDs + factory functions
```

## Frontend Patterns

### React Router Loaders/Actions

```typescript
import { apiClient } from "@frontend/lib/api-client";

export async function loader() {
  const res = await apiClient.api.me.$get();
  const data = await res.json();
  return data;
}
```

### API Client (RPC)

```typescript
import { hc } from "hono/client";
import type { ApiRoutesAppType } from "@backend/routes/index.js";

export const apiClient = hc<ApiRoutesAppType>("/api");
```

### Frontend Rules

- API calls use `apiClient` (hc RPC) in loaders/actions — no direct fetch to `/api/*`
- Use auth provider hooks/components for auth on frontend
- Routes in `app/client/routes/` use React Router flat file routing (`flatRoutes` from `@react-router/fs-routes`)
- Feature components in `app/client/components/<feature>/`
- App-level components in `app/client/components/`
- Hooks in `app/client/hooks/` or colocated with feature
- Styling with Tailwind CSS classes
- Error boundaries for graceful error handling

## OpenAPI Documentation

All routes must be documented with `describeRoute()` for OpenAPI docs. Include request/response examples.

## Quality Gates

Every commit must pass:

```bash
npm run typecheck   # TypeScript compilation
npm run lint        # Linting (0 errors)
npm run test:unit   # Service unit tests
npm run build       # Production build
```

## Pre-commit Hooks

husky + lint-staged runs ESLint (`--fix`) on staged `app/**/*.{ts,tsx}` and Prettier (`--write`) on all staged files. Commits will fail if ESLint reports errors.
