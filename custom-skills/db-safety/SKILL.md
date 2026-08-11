---
name: db-safety
description: Database safety rules. Auto-applies when working with database migrations, schema changes, SQL queries, or any destructive database operations. Covers migration safety, table protection, and recovery-first mindset.
---

# Database Safety

The full rule set — hard-stop approval gate, migration safety, table protection, recovery-first
mindset — lives in `~/.agents/rules/db-safety.md`. It auto-loads in full whenever a migration or
schema file is touched (`paths:` frontmatter matches `**/migrations/**`, `prisma/schema.prisma`,
`**/*.sql`, etc.), so it doesn't depend on this skill being invoked.

**This skill exists for the gap the path-based rule can't cover: a destructive database action with
no file involved** — an ad-hoc `psql`/`mysql`/`redis-cli` session, a one-off `DELETE` typed straight
into a DB console, a `wrangler d1 execute` call. Same rule applies with no exceptions: state what the
command does, name what data could be lost, wait for explicit approval, back up first if approved and
data matters. Read `~/.agents/rules/db-safety.md` for the full detail before acting.
