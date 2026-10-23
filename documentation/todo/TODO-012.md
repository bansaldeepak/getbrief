---
id: TODO-012
title: Verify Gemini .agents/rules/ compatibility with live test
priority: P2
status: open
created: 2026-08-25
story: null
link: null
_brief:
  version: 1
  record_id: f8b4e1ad-02c2-4818-848a-07aa409ebb92
  item:
    id: TODO-012
    type: todo
    title: Verify Gemini .agents/rules/ compatibility with live test
    status: open
    priority: P2
    created: 2026-08-25
    link: null
    pr: null
---

## What

Verify Gemini .agents/rules/ compatibility with live test

## Why

## What
Test that Gemini Code Assist actually reads rules from `.agents/rules/` at runtime, not just in documentation.

## Why
The agent compatibility matrix in the brief-project-setup TRD claims Gemini reads `.agents/rules/` natively. This is based on documentation research, not live verification. If wrong, one-third of rules-gen.mjs (T5) generates files nobody reads.

## How to verify
1. Create a project with `.agents/rules/test-rule.md` containing a distinctive instruction
2. Open the project in Gemini Code Assist
3. Verify the rule influences agent behavior
4. If fails: remove Gemini path from rules-gen, update compatibility matrix

## Priority
P2 — blocks confidence in T5 shipping, but fix is trivial if wrong (remove one code path).

## Depends on
- Having Gemini Code Assist configured on a test project
- T5 implementation (so you can test the actual generated output)

## Context

<!-- Where in the code this lives. Relevant files, functions, constraints. -->

## Resolution

_Filled when done:_
- Resolved by: <!-- S-NNN / inline fix -->
- PR: <!-- #NNN -->
- Date: <!-- YYYY-MM-DD -->
