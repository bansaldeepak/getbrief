---
description: Provider-specific instrumentation — Sentry, PostHog, OTel, or similar.
---

## Error Reporting
<!-- brief:auto section="error-reporting" -->
<!-- Example: Sentry.init() in entry point. captureException() for unexpected errors only. -->
<!-- /brief:auto -->

## Analytics
<!-- brief:auto section="analytics" -->
<!-- Example: PostHog.capture() for business events. Never for debug logging. -->
<!-- /brief:auto -->

## Tracing
<!-- brief:auto section="tracing" -->
<!-- Example: OTel spans wrap external calls. Propagate trace-id in headers. -->
<!-- /brief:auto -->

## Alerts
<!-- brief:auto section="alerts" -->
<!-- Example: Sentry alert on new issue. PagerDuty for P1 (>5% error rate). -->
<!-- /brief:auto -->
