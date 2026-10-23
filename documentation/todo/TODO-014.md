---
id: TODO-014
title: Delete rules-gen.mjs dead code
priority: P3
status: deferred
created: 2026-09-01
story: null
link: null
_brief:
  version: 1
  record_id: 3ce1261e-2b48-4ad7-9d85-d5973c4da3e5
  item:
    id: TODO-014
    type: todo
    title: Delete rules-gen.mjs dead code
    status: deferred
    priority: P3
    created: 2026-09-01
    link: null
    pr: null
---

## What

Delete rules-gen.mjs dead code

## Why

## Context
rules-gen.mjs exports generateRuleSkeletons/generateCodexSection — built and tested (19 test callsites in rules-gen.test.mjs) but never wired into init.mjs or any CLI entrypoint. copyRelevantRules() does the actual rule installation instead.

## Why
With harness.mjs now owning AGENTS.md marker injection (section='harness'), having rules-gen.mjs also capable of writing markers to AGENTS.md (section='conventions') creates confusion about ownership. Two modules writing markers to the same file with different section IDs technically works (mergeContent handles it), but the dead codepath shouldn't exist.

## Action
Delete lib/rules-gen.mjs and test/rules-gen.test.mjs. Verify no runtime import exists (confirmed: only test file imports it).

## Depends on
Harness injection feature (S-011) ships first — it establishes harness.mjs as the canonical AGENTS.md marker writer.

## Context

<!-- Where in the code this lives. Relevant files, functions, constraints. -->

## Resolution

**Deferred:** CEO review (S-014) decided to keep rules-gen.mjs for structured rule output across providers. Revisit when cross-provider rule generation ships.
