---
id: TODO-015
title: Expand detectStack() for observability and analytics packages
priority: P2
status: open
created: 2026-09-04
source: S-014 eng review (Codex outside voice)
---

## Problem
`detectStack()` in `lib/detect.mjs` only detects web frameworks (express, hono, django, etc.) from package.json/pyproject.toml. It does NOT detect observability packages (@sentry/node, posthog-node, @opentelemetry/*) or analytics packages (amplitude, mixpanel, @segment/analytics-node).

This means 2 manifest rules can never trigger:
- `observability-wiring` (detect: `["package.json:@sentry|posthog|@opentelemetry"]`)
- `product-analytics` (detect: `["package.json:posthog|amplitude|mixpanel|segment"]`)

## Fix
Add observability and analytics package names to `FRAMEWORK_PATTERNS.npm` in `detect.mjs`, or create separate `OBSERVABILITY_PATTERNS` / `ANALYTICS_PATTERNS` constants. Then add detected packages to `detection.frameworks` (or a new `detection.observability` / `detection.analytics` field — but the simpler path is reusing frameworks).

## Scope
- `lib/detect.mjs` — add patterns
- `test/detect.test.mjs` — add test cases
- No manifest changes needed (patterns already correct)
