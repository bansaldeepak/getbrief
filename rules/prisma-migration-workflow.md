---
description: Always use db:migrate (not db:push) for schema changes — creates migration files for CI/CD. Then run db:generate before live testing.
globs: ["prisma/schema.prisma", "**/prisma/**/*.sql", "**/prisma/migrations/**"]
---

# Prisma Migration Workflow

## Never use `db:push` for schema changes

`npm run db:push` applies schema changes directly to the database WITHOUT creating a migration file. This breaks CI/CD:

- Feature branch uses `db:push` locally → no migration file generated
- CI runs `prisma migrate deploy` → nothing to deploy (no migration file exists)
- Deployed environment has stale schema → workers crash with `SCHEMA_MISMATCH` or `Unknown argument <field>`

## Correct workflow: use `db:migrate`

For any `schema.prisma` change:

```bash
# 1. Update schema.prisma
# 2. Create a migration (generates prisma/migrations/<timestamp>/migration.sql)
npm run db:migrate

# When prompted, name the migration descriptively (e.g., add_s051_session_outcomes)

# 3. Always regenerate the Prisma client after migration
npm run db:generate

# 4. Now safe to run live tests/sessions
npm run dev
npm test
```

## Why db:generate is separate

The Prisma client code generation happens independently of the migration. After `db:migrate` applies the new schema, you must run `db:generate` before using the new fields, or you'll get runtime errors like `Unknown argument session1Outcome @ ...` — this is silent (no compile error, only runtime crash).

## When db:push is safe

Only for throwaway local experiments that will never go through CI. Never on a feature branch that will be PR'd and deployed.

## Reference

- S-045: `db:push` used locally, broke first CI deploy with missing `inactive_stage` column
- S-051: Stale Prisma client after migration caused 30 min debugging of `Unknown argument session1Outcome`
