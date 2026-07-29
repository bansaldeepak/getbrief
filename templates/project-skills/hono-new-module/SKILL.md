---
name: new-module
description: Scaffold a new Hono API module in app/server/modules/. Use when creating a new API module or adding a new endpoint domain. Creates routes, service, schemas, tests, and README, then registers the module in the route aggregator.
argument-hint: [module-name]
---

# Create New Module

Scaffold a complete Hono module for `$ARGUMENTS` in `app/server/modules/$ARGUMENTS/`.

Patterns come from the `hono-react-router-prisma` skill; architecture rules from `backend-standards`.
This skill is the **procedure** — it does not restate either.

## 1. Study existing code first

```
app/server/modules/user/{routes,service,schemas,index}.ts   # the reference implementation
prisma/schema.prisma                                        # the model you're exposing
app/server/routes/index.ts                                  # where it gets registered
```

Understand the domain and which endpoints are actually needed before writing anything.

**Sub-module check:** if this belongs under an existing domain, create it as
`app/server/modules/<parent>/$ARGUMENTS/` with the same shape and re-export from the parent barrel,
rather than as a new top-level module.

## 2. Create the structure

```
app/server/modules/$ARGUMENTS/
  README.md      # purpose, concepts, key files, architecture, design decisions
  index.ts       # barrel — re-exports routes
  routes.ts      # Hono route definitions
  service.ts     # business logic, PrismaClient first param
  schemas.ts     # Zod schemas + inferred types
  __tests__/$ARGUMENTS-service.test.ts
```

## 3. Write the files

Follow the route idiom, service signature, and schema inference in the `hono-react-router-prisma`
skill. Non-negotiables for a new module:

- Every input validated with `zValidator()` — body, query, and params
- Auth middleware on every non-public route
- Types inferred with `z.infer<>`, never declared alongside the schema
- Pagination on the list endpoint with an explicit maximum
- `P2002` → 409, `P2025` → 404
- Unbroken method chaining, and `export type ...RoutesType = typeof routes`

## 4. Register it

```typescript
// app/server/routes/index.ts
import { {camelCase}Routes } from "../modules/$ARGUMENTS/index.js";

// add to the chain:
.route("/{plural-kebab}", {camelCase}Routes)
```

The path is plural and kebab-case. Verify the RPC client picks up the new type after registering.

## 5. Test it

Unit tests for every exported service function, using `createMockPrisma()` and factory fixtures.
Add a factory to `app/server/__tests__/helpers/fixtures.ts` and stable UUIDs to `IDS` — never inline
hardcoded UUIDs.

Cover, per function: the success case, the not-found case, and the constraint-violation case where
one exists. Assert both the return value and the arguments the Prisma mock was called with.

## 6. Verify

```bash
npm run typecheck && npm run lint && npm run test:unit && npm run build
```

## 7. Sync documentation

- `documentation/rules/tech-stack.md` — add the module to the project structure tree
- `AGENTS.md` — update the architecture section if the module list changed
- The module's own `README.md` — written, not stubbed

## Checklist

- [ ] Module directory created with all six files
- [ ] `zValidator()` on every input; auth on every protected route
- [ ] Types inferred from schemas; list endpoint paginated
- [ ] Prisma error codes mapped to HTTP status
- [ ] Registered in `app/server/routes/index.ts` with a plural kebab-case path
- [ ] Route type exported for RPC inference
- [ ] Service tests cover success, not-found, and conflict paths
- [ ] Fixture factory + stable IDs added
- [ ] `README.md` written
- [ ] All four quality gates pass
- [ ] Docs synced
