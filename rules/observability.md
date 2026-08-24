---
description: Vendor-agnostic observability principles — four signals, one abstraction per signal, failure isolation, flush semantics.
---

# Observability

Telemetry is a dependency like any other. It belongs behind an abstraction, initialized at a boundary, and it must never break the thing it observes.

## Four Signals, One Job Each

| Signal | Answers | Emit when |
|--------|---------|-----------|
| **Log** | "What happened, in order" | State transition or decision needed to reconstruct the run |
| **Error report** | "What broke, with context" | Unexpected failure — this pages someone |
| **Span / trace** | "Where did the time go" | Crossing a database, API, queue, or model boundary |
| **Product event** | "What did a user accomplish" | A business outcome became true |

One fact belongs to one signal. An error is not a product event.

## One Abstraction Per Signal

- Business code never imports a vendor SDK directly
- Each signal gets one entry point (`createLogger`, `startSpan`, `trackEvent`)
- The abstraction owns: no-op on missing config, default context, redaction, vendor swap
- Grep vendor package names; hits outside abstraction files = violation

## Core Rules

- Correlation ID minted at ingress, inherited by background work, attached to everything
- Redaction lives in the abstraction — emit the identifier, not the content
- Missing configuration disables telemetry, never breaks boot or a request
- Flush before return in any runtime that exits at response (serverless, edge workers)
- Verify each backend receives data at production sample rate — empty dashboard raises no error
- Report unexpected failures only; expected ones (404, validation) are logs
- Catalogs go in reference docs, not in rules or skills

## What Belongs in Project Rules Instead

Vendor choice, SDK paths, env vars, sample rates, alert routing, dashboard links — all project-specific, not global.
