---
name: hono-react-router-prisma
description: Stack conventions for this repo — Hono API backend, React Router SSR frontend, Prisma ORM. Auto-applies when working anywhere in app/. Covers the Hono route idiom, service signatures, Zod inference, the RPC client, and the dual vitest setup.
---

# Hono + React Router + Prisma

Stack idioms for this repo. Architecture rules come from `backend-standards` and `frontend-standards`;
universal rules from `coding-standards`. This skill covers **only what is specific to these libraries** —
if a statement here would also be true in a Fastify or Next.js repo, it belongs in a global skill instead.

## Layout

- **Single worker/server** — Hono serves `/api/*`, React Router serves everything else (SSR)
- `app/server/` — Hono, feature modules, Prisma, Zod, OpenAPI
- `app/client/` — React Router, auth provider, analytics, `hc<AppType>` RPC client
- `app/shared/` — environment-agnostic types and utils
- Aliases: `@frontend/*`, `@backend/*`, `@shared/*`
- **Frontend never imports `@backend/*`; backend never imports `@frontend/*`**

## Route Idiom (Required)

Functional routes with method chaining. No class-based controllers — the chained type is what the
RPC client infers from, so breaking the chain breaks frontend type safety.

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import type { AppContext } from "../../shared/types/context.js";
import { clerkAuth } from "../../shared/middleware/clerk.js";
import { createSchema, paginationSchema } from "./schemas.js";
import * as service from "./service.js";

const routes = new Hono<AppContext>()
  .get("/", clerkAuth, zValidator("query", paginationSchema), async (c) => {
    const prisma = c.get("prisma");
    const { page, limit } = c.req.valid("query");
    const { items, total } = await service.list(prisma, page, limit);
    return c.json({
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
  .post("/", clerkAuth, zValidator("json", createSchema), async (c) => {
    const prisma = c.get("prisma");
    const item = await service.create(prisma, c.req.valid("json"));
    return c.json({ data: item }, 201);
  });

export default routes;
export type RoutesType = typeof routes;
```

Required: `new Hono<AppContext>()`, unbroken chaining, auth middleware per route, `zValidator()` on
every input, exported `typeof` for RPC inference.

## Services

`PrismaClient` is always the first parameter. No `req`/`res` — see the layer contract in
`backend-standards`.

```typescript
import type { PrismaClient } from "../../../generated/prisma/client.js";

export async function create(prisma: PrismaClient, data: CreateInput) {
  return prisma.resource.create({ data });
}
```

Use Prisma's generated types; never hand-write a database type.

## Schemas

```typescript
export const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
});

export type CreateInput = z.infer<typeof createSchema>;
```

Query params arrive as strings — convert with `.transform()` inside the schema.

## Errors

```typescript
throw new HTTPException(404, { message: "User not found" });  // also Prisma P2025
throw new HTTPException(409, { message: "Resource already exists" });  // Prisma P2002
```

Map `P2002` → 409 and `P2025` → 404 in the service or provider. Let unknown errors reach the global
handler untouched.

## Module Shape

```
app/server/modules/<name>/
  README.md   index.ts   routes.ts   service.ts   schemas.ts   __tests__/
```

Multi-auth modules split by context: `admin-routes.ts`, `customer-routes.ts`, `public-routes.ts`,
re-exported from `index.ts`. Providers live in `app/server/providers/<name>/` with
`types.ts`, `client.ts`, `index.ts`.

## Frontend Wiring

```typescript
// app/client/lib/api-client.ts
import { hc } from "hono/client";
import type { ApiRoutesAppType } from "@backend/routes/index.js";

export const apiClient = hc<ApiRoutesAppType>("/api");
```

```typescript
export async function loader() {
  const res = await apiClient.api.me.$get();
  return res.json();
}
```

- All API calls go through `apiClient` in loaders/actions — never a raw `fetch` to `/api/*`
- Routes use flat file routing (`flatRoutes` from `@react-router/fs-routes`)
- Styling is Tailwind; component architecture follows `frontend-standards`

## Testing

Two vitest configs:

| Config | Pool | Purpose | Command |
|--------|------|---------|---------|
| `vitest.config.ts` | `@cloudflare/vitest-pool-workers` | Integration (Workers runtime) | `npm test` |
| `vitest.unit.config.ts` | Node | Service units (mocked Prisma) | `npm run test:unit` |

```typescript
import { createMockPrisma } from "@backend/__tests__/helpers/prisma-mock.js";
import { IDS, makeEntity } from "@backend/__tests__/helpers/fixtures.js";

const prisma = createMockPrisma({
  entity: { findMany: vi.fn().mockResolvedValue([makeEntity()]), count: vi.fn().mockResolvedValue(1) },
});
```

- Test file: `app/server/modules/<name>/__tests__/<name>-service.test.ts`
- Mock Prisma with `createMockPrisma()` — no external mocking libraries
- `$transaction`: `vi.fn().mockImplementation((fn) => fn(txMock))`
- Helpers: `app/server/__tests__/helpers/{prisma-mock,fixtures}.ts`

## Documentation & Enforcement

- TSDoc required on exports in `app/server/`, `app/shared/`, and non-JSX `app/client/**/*.ts`
- `eslint-plugin-jsdoc` + `eslint-plugin-tsdoc` enforce it at warn level; `npm run docs:typedoc` generates
- All routes documented with `describeRoute()` for OpenAPI

## Quality Gates

Every commit must pass:

```bash
npm run typecheck && npm run lint && npm run test:unit && npm run build
```

husky + lint-staged run ESLint `--fix` on staged `app/**/*.{ts,tsx}` and Prettier on all staged files.
