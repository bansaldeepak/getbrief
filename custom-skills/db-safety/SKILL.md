---
name: db-safety
description: Database safety rules. Auto-applies when working with database migrations, schema changes, SQL queries, or any destructive database operations. Covers migration safety, table protection, and recovery-first mindset.
---

# Database Safety (Non-Negotiable)

**Data is sacred. Losing data — even local test data — is unacceptable.** These rules apply to ALL environments (local, dev, staging, prod).

## NEVER Drop or Delete Tables

- **Never run `DROP TABLE`** — not even on local databases. Even if the user asks, **confirm first** and explain the data loss implications.
- **Never run `TRUNCATE TABLE`** or `DELETE FROM table` without a WHERE clause.
- If a table needs to be recreated (e.g., column rename in SQLite), use the safe migration pattern:
  1. Create new table with correct schema
  2. Copy data from old table to new table
  3. Drop old table (only after data is safely copied)
  4. Rename new table to original name
- **Always prefer non-destructive alternatives**: `ALTER TABLE ADD COLUMN`, `ALTER TABLE RENAME COLUMN`, `CREATE TABLE IF NOT EXISTS`.

## Migration Safety

- **Use the project's migration tooling** — never run raw SQL files manually. Use framework migration commands that track applied state (e.g., `wrangler d1 migrations apply`, `prisma migrate deploy`, `alembic upgrade head`, `goose up`).
- **Never modify a migration that has been applied to any remote environment** — create a new migration instead.
- **Never write migrations manually if the framework generates them** — use `prisma migrate diff`, `prisma migrate dev`, or equivalent. Only hand-write when the generator doesn't support the operation.
- **Column renames in SQLite** — use `ALTER TABLE ... RENAME COLUMN` (supported in SQLite 3.25+/D1). Never drop+recreate the table.
- **Column type changes** — create a new column, backfill, then drop the old one (in a separate, later migration after verification).
- **Test migrations against a copy of the DB** — never against the primary database without a backup.
- **No idempotent hacks** — don't use `IF NOT EXISTS` / `|| echo` to paper over re-running migrations. If the migration tool tracks state properly, each migration runs exactly once.

## Before Any Destructive DB Operation

**HARD STOP.** Before executing any command that deletes, drops, truncates, or overwrites database data:

1. **State what you're about to do** and why
2. **List what data will be lost**
3. **Propose a non-destructive alternative** if one exists
4. **Wait for explicit user approval** — even if the user previously asked for the change
5. If approved and data matters: **back up first** (`SELECT * FROM table` -> dump, or copy the SQLite file)

This applies to local databases too. Test data takes time to create and represents real testing effort.

## Recovery-First Mindset

- When facing schema conflicts: **migrate data, don't destroy it**
- When facing test failures: **fix the test or code, don't reset the DB**
- When facing corruption: **copy the DB file first**, then attempt repair
