---
name: observability
description: Vendor-agnostic observability standards. Auto-applies when adding or changing logging, error reporting, tracing, spans, metrics, or analytics instrumentation, and when wiring an SDK such as Sentry, OpenTelemetry, Datadog, PostHog, or Langfuse. Enforces one abstraction per signal, context propagation, redaction at the boundary, failure isolation, and flush semantics. Extends coding-standards; vendor choice and wiring live in project skills.
---

# Observability Standards

Rules for instrumenting code in any language, runtime, or vendor. Structured logging basics, log levels, and "never log secrets" come from `coding-standards` §9–10 and are not repeated here; event and property naming comes from `product-analytics`. This skill covers what is specific to making a system observable without coupling it to a vendor or breaking it.

**The rule that matters most:** telemetry is a dependency like any other. It belongs behind an abstraction, initialized at a boundary, and it must never be able to break the thing it observes.

## 1. Four Signals, One Job Each

| Signal | Answers | Emit when |
|--------|---------|-----------|
| **Log** | "What happened, in order, in this execution" | A state transition or decision someone would need to reconstruct the run |
| **Error report** | "What broke, with enough context to reproduce" | An unexpected failure — this is what pages someone |
| **Span / trace** | "Where did the time go, across which boundary" | Crossing into a database, external API, queue, or model call |
| **Product event** | "What did a user accomplish" | A business outcome became true |

**One fact belongs to one signal.** A failure that is logged, reported, *and* tracked as an event produces three dashboards that disagree. Log it for context, report it for alerting, and stop.

**An error is not a product event, and a log line is not a metric.** Counting occurrences by grepping logs, or reconstructing a funnel from error reports, means the signal was chosen wrong at the call site.

## 2. One Abstraction Per Signal

Business code never imports a vendor SDK. Each signal gets exactly one entry point — `createLogger()`, the error path, `startSpan()`, `trackEvent()` — and those are the only names that appear outside the abstraction.

The abstraction is the single place that owns:

- **The no-op.** Missing credentials disable telemetry; they never throw and never crash boot.
- **Default context** attached to every emission — environment, release, service name.
- **Redaction**, so it cannot be forgotten at a call site.
- **Vendor swap.** Twenty call sites importing the SDK directly is what makes a migration a quarter instead of a day.

**The check is mechanical:** grep the vendor package names across the repo. Hits outside the abstraction files and the process entry point are violations. Wire that grep into CI once and the rule enforces itself.

**Initialization happens once, at the process entry, before anything it instruments is imported.** Instrumentation that patches modules at load time silently no-ops if it registers late — and a bundler, a loader flag, or an import order change is enough to break it without an error. Verify at runtime that spans actually arrive; do not assume registration succeeded.

## 3. Context Propagation

A correlation identifier is created at the ingress boundary — or adopted from the caller's header if present — and attached to every log line, error report, span, and outbound request for the life of that request.

- **Propagate through the runtime's context mechanism** (async-local storage, request context, framework middleware), never by threading a parameter through six layers.
- **Every logger is module-scoped and named**, so a filter by module is always available.
- **Identity comes from the verified token**, never from a client-supplied field — same rule as `backend-standards` §6.
- **Background work inherits the identifier from its message.** A queue consumer that mints a fresh one severs the trace at exactly the boundary you needed to see across.

## 4. What Must Never Leave the Process

`coding-standards` §10 forbids secrets, tokens, and PII. Three additions that are specific to telemetry, because telemetry ships data to a third party and retains it:

- **Never the payload of something a user believed was private** — message contents, transcripts, uploaded media, audio or camera frames, signaling payloads, document bodies.
- **Never full request or response bodies by default.** Log the shape and the identifiers; opt a field in deliberately.
- **Redact at the abstraction, not at the call site.** A deny-list of key names plus an allow-list for known-safe fields, applied centrally. A rule that depends on every author remembering it has already failed.

**When in doubt, emit the identifier, not the content.** `messageId`, never the message.

## 5. Telemetry Must Not Break the Request

- **Failure-isolate every emission in the request path.** A vendor outage degrades observability, not availability.
- **Never block the user's response on a flush** where the platform offers a post-response hook.
- **But in a runtime that freezes or exits when the response is sent** — serverless, edge workers, lambdas, short-lived jobs — you *must* flush before returning. SDK batching defaults assume a long-lived process; leave them alone there and events vanish with no error.
- **Sampling is a cost lever with a correctness trap.** When two backends share one pipeline, one vendor's sampler can silently govern the other: at a low rate the second dashboard goes quiet with nothing logged anywhere. Give each backend its own exporter, and verify each one still receives data *at the production sample rate* — not at 100% in dev.

An empty dashboard and no error is the characteristic failure of this whole area. Assume nothing is wired until you have seen data arrive.

## 6. Server-Side

- **Capture at the outermost boundary.** One error handler reports everything unhandled. A `try/catch` whose only purpose is to report is noise — catch only to *add context the boundary cannot have*, then re-throw.
- **Expected failures are not error reports.** Validation rejections, 404s, and auth denials are logs or metrics. Reporting them is how an alert channel becomes background noise and a real 500 gets ignored.
- **In stateless runtimes, telemetry clients are per-request** — created, used, flushed, discarded. A module-level client that outlives the request leaks state across users.
- **Health and readiness endpoints are excluded** from tracing and analytics, or they will dominate every sample.

## 7. Browser-Side

- **An error boundary per route** reports the failure and renders a recovery path — never a blank screen.
- **Register global handlers at app entry** for uncaught errors and unhandled rejections; a rejected promise is the most commonly missed client failure.
- **Session replay and breadcrumbs mask by default and unmask by exception.** The safe default is: all text and all input values masked, then explicitly allow what is safe to see. Configured the other way round, the first form someone adds leaks.
- **Strip tokens from captured URLs.** Breadcrumbs record navigation, and credentials in query strings end up in a vendor's retention.
- **Sample deliberately.** Client volume is unbounded and driven by traffic, not by your code.
- **Upload source maps to the error backend; do not serve them publicly.**

## 8. Instrumenting a New Module

1. **Logger** — module-scoped, at module scope, named for the module.
2. **Errors** — let them propagate to the boundary handler. Report directly only where you add context that boundary lacks.
3. **Product events** — emit where the business outcome becomes true, not where the code happens to be.
4. **Spans** — only across a boundary you might one day blame.

Anything that does not fit these four is a fifth mechanism. Don't add one.

## 9. Catalogs Are Documentation, Not Instruction

Event catalogs, property tables, and per-feature signal inventories change with every story. Kept inside a skill or an always-loaded rule, they guarantee it goes stale and pay context cost on every unrelated task.

Keep the **naming rule** in the skill and the **names** in a reference doc. Same for anything a reader looks *up* rather than needs *by default*.

## 10. What Belongs in a Project Skill Instead

Push to a project-level `.claude/skills/` skill anything only true of one repo:

- Which vendors are used for which signal, and why each was chosen
- The abstraction module paths and their signatures
- Environment variables, where they are set, and which are required
- Runtime and boot constraints — which integrations actually function under that bundler, loader, or deploy target
- Sample rates, retention windows, alert routing, and dashboard links
- Where the event catalog lives

## Rules

- One abstraction per signal; vendor SDK names appear only there and at the process entry
- One fact, one signal — an error is not a product event
- Correlation ID minted at ingress, inherited by background work, attached to everything
- Redaction lives in the abstraction; emit the identifier, not the content
- Missing configuration disables telemetry, never breaks boot or a request
- Flush before return in any runtime that exits at response
- Verify each backend receives data at the production sample rate — an empty dashboard raises no error
- Report unexpected failures only; expected ones are logs
- Mask replay and breadcrumbs by default, unmask by exception
- Catalogs go in reference docs, not in a skill
