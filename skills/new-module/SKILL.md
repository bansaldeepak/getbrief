---
name: new-module
description: Scaffold a new Hono API module in app/server/modules/. Use when creating a new API module or adding a new endpoint domain. Creates routes, service, schemas, and index with Hono patterns, Zod validation, and Prisma services. Requires the hono-react-router-prisma-stack.
argument-hint: [module-name]
---

# Create New Module

Scaffold a complete Hono module for `$ARGUMENTS` in `app/server/modules/$ARGUMENTS/`.

## Step-by-Step

### 1. Study the Existing Code

Before writing anything, study existing modules for patterns:

```
Read app/server/modules/user/routes.ts    # Route pattern
Read app/server/modules/user/service.ts   # Service pattern
Read app/server/modules/user/schemas.ts   # Schema pattern
Read app/server/modules/user/index.ts     # Index pattern
Read prisma/schema.prisma                 # DB models
```

Understand the domain, the Prisma model, and what endpoints are needed.

### 2. Create Directory Structure

```
app/server/modules/$ARGUMENTS/
  README.md      # Module overview, concepts, design decisions (REQUIRED)
  index.ts       # Re-exports routes
  routes.ts      # Hono route definitions
  service.ts     # Business logic (PrismaClient as first param)
  schemas.ts     # Zod validation schemas + inferred types
  __tests__/
    $ARGUMENTS-service.test.ts  # Service unit tests
```

**Sub-module pattern**: If the new module belongs under an existing domain (e.g., related concerns under a parent), create it as a sub-module instead of a top-level module. Example: `app/server/modules/parent/child/` with the same file structure. Re-export from the parent `index.ts`. Look for existing sub-modules as reference implementations.

### 3. Create Schemas File (`schemas.ts`)

```typescript
import { z } from "zod";

export const create{PascalCase}Schema = z.object({
  // Fields with Zod validation
  name: z.string().min(1, "Name is required"),
});

export const {camelCase}IdSchema = z.object({
  id: z.string().uuid("Invalid ID"),
});

export const paginationSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
});

// Infer types from schemas — never define separately
export type Create{PascalCase}Input = z.infer<typeof create{PascalCase}Schema>;
```

### 4. Create Service File (`service.ts`)

```typescript
import type { PrismaClient } from "../../../generated/prisma/client.js";
import type { Create{PascalCase}Input } from "./schemas.js";

/** List all {name}s with pagination. */
export async function list{PascalCase}s(prisma: PrismaClient, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.$ARGUMENTS.findMany({ skip, take: limit, orderBy: { id: "asc" } }),
    prisma.$ARGUMENTS.count(),
  ]);
  return { items, total };
}

/** Find a single {name} by ID. */
export async function get{PascalCase}ById(prisma: PrismaClient, id: string) {
  return prisma.$ARGUMENTS.findUnique({ where: { id } });
}

/** Create a new {name}. */
export async function create{PascalCase}(prisma: PrismaClient, data: Create{PascalCase}Input) {
  return prisma.$ARGUMENTS.create({ data });
}
```

### 5. Create Routes File (`routes.ts`)

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import type { AppContext } from "../../shared/types/context.js";
import { clerkAuth } from "../../shared/middleware/clerk.js";
import {
  create{PascalCase}Schema,
  {camelCase}IdSchema,
  paginationSchema,
} from "./schemas.js";
import * as {camelCase}Service from "./service.js";

const {camelCase}Routes = new Hono<AppContext>()
  .get(
    "/",
    clerkAuth,
    zValidator("query", paginationSchema),
    async (c) => {
      const prisma = c.get("prisma");
      const { page = 1, limit = 10 } = c.req.valid("query");
      const { items: data, total } = await {camelCase}Service.list{PascalCase}s(prisma, page, limit);
      return c.json({
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
  )
  .get(
    "/:id",
    clerkAuth,
    zValidator("param", {camelCase}IdSchema),
    async (c) => {
      const prisma = c.get("prisma");
      const { id } = c.req.valid("param");
      const item = await {camelCase}Service.get{PascalCase}ById(prisma, id);
      if (!item) throw new HTTPException(404, { message: "{PascalCase} not found" });
      return c.json({ data: item });
    }
  )
  .post(
    "/",
    clerkAuth,
    zValidator("json", create{PascalCase}Schema),
    async (c) => {
      const prisma = c.get("prisma");
      const data = c.req.valid("json");
      try {
        const item = await {camelCase}Service.create{PascalCase}(prisma, data);
        return c.json({ data: item }, 201);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
          throw new HTTPException(409, { message: "{PascalCase} already exists" });
        }
        throw error;
      }
    }
  );

export default {camelCase}Routes;
export type {PascalCase}RoutesType = typeof {camelCase}Routes;
```

### 6. Create Index File (`index.ts`)

```typescript
export { default as {camelCase}Routes } from "./routes.js";
```

### 7. Create Module README (`README.md`)

Every module must have a README. See the [`hono-react-router-prisma-stack`](~/.Codex/skills/hono-react-router-prisma-stack/SKILL.md) skill for required README contents.

### 8. Register in Route Aggregator

Add to `app/server/routes/index.ts`:

```typescript
import { {camelCase}Routes } from "../modules/$ARGUMENTS/index.js";

// Add to the chain:
.route("/{plural-kebab}", {camelCase}Routes)
```

### 9. Create Service Tests (`__tests__/$ARGUMENTS-service.test.ts`)

Every module with a `service.ts` must have unit tests. Follow the project's `documentation/rules/testing.md`.

```typescript
import { describe, it, expect, vi } from "vitest";
import { createMockPrisma } from "@backend/__tests__/helpers/prisma-mock.js";
import { IDS, make{PascalCase} } from "@backend/__tests__/helpers/fixtures.js";
import { list{PascalCase}s, get{PascalCase}ById, create{PascalCase} } from "../service.js";

describe("list{PascalCase}s", () => {
  it("returns paginated results", async () => {
    const item = make{PascalCase}();
    const prisma = createMockPrisma({
      $ARGUMENTS: {
        findMany: vi.fn().mockResolvedValue([item]),
        count: vi.fn().mockResolvedValue(1),
      },
    });

    const result = await list{PascalCase}s(prisma, 1, 10);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

describe("get{PascalCase}ById", () => {
  it("returns item when found", async () => {
    const item = make{PascalCase}();
    const prisma = createMockPrisma({
      $ARGUMENTS: { findUnique: vi.fn().mockResolvedValue(item) },
    });

    const result = await get{PascalCase}ById(prisma, IDS.$ARGUMENTS1);
    expect(result).toEqual(item);
  });

  it("returns null when not found", async () => {
    const prisma = createMockPrisma({
      $ARGUMENTS: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    const result = await get{PascalCase}ById(prisma, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("create{PascalCase}", () => {
  it("creates and returns the item", async () => {
    const item = make{PascalCase}();
    const prisma = createMockPrisma({
      $ARGUMENTS: { create: vi.fn().mockResolvedValue(item) },
    });

    const result = await create{PascalCase}(prisma, { /* valid input */ });
    expect(result).toEqual(item);
    expect(prisma.$ARGUMENTS.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ /* expected fields */ }),
    });
  });
});
```

**Also add** a factory function to `app/server/__tests__/helpers/fixtures.ts` and stable UUIDs to the `IDS` object.

### 10. Quality Checks

Run all checks before considering the module complete:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

### 11. Documentation Sync

Update all docs that reference module structure:
- [ ] `documentation/rules/tech-stack.md` — add module to project structure tree
- [ ] `AGENTS.md` — update architecture section if new module changes the module list

### 12. Checklist

**Code quality:**
- [ ] Routes use `new Hono<AppContext>()` with method chaining
- [ ] Auth middleware on all protected routes
- [ ] `zValidator()` on all request inputs
- [ ] Service functions receive `PrismaClient` as first param
- [ ] Types inferred from Zod schemas with `z.infer<>`
- [ ] `HTTPException` for error responses
- [ ] Prisma error codes handled (P2002, P2025)
- [ ] Module `README.md` created

**Testing:**
- [ ] `__tests__/<module>-service.test.ts` exists with tests for all exported service functions
- [ ] Uses `createMockPrisma()` and factory fixtures (no hardcoded UUIDs)
- [ ] Tests both success and error paths
- [ ] Factory function added to `fixtures.ts`, stable IDs added to `IDS`

**Integration:**
- [ ] Module registered in `app/server/routes/index.ts`
- [ ] Route type exported for RPC inference

**Quality gates (all must pass):**
- [ ] `npm run typecheck` — zero type errors
- [ ] `npm run lint` — zero lint errors
- [ ] `npm run test:unit` — all unit tests pass
- [ ] `npm run build` — builds successfully

**Documentation sync:**
- [ ] `documentation/rules/tech-stack.md` project structure updated
- [ ] `AGENTS.md` architecture section updated if module list changed

**Standards:**
- [ ] REST conventions: plural nouns, correct HTTP methods, kebab-case paths
- [ ] Response format: `{ data }` for success, `HTTPException` for errors
- [ ] No `any`, no `@ts-ignore`, `import type` for type-only imports
