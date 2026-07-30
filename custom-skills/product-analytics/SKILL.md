---
name: product-analytics
description: Provider-agnostic product analytics and feature flag conventions. Auto-applies when working with analytics, feature flags, custom events, or user tracking. Provider wiring (PostHog, Amplitude, Mixpanel) lives in a project skill, not here.
---

# Analytics Conventions

Universal, provider-agnostic analytics rules. Whichever provider a repo uses, its wiring lives in that repo's own `product-analytics` project skill.

Naming, flags, and custom properties are this skill. *Emitting* an event — which signal it belongs to, the abstraction it goes through, per-request lifecycle, and flushing before the runtime exits — is `observability`.

## General Rules (Provider-Agnostic)

### API Keys & Secrets

- **Never hardcode API keys** — always use environment variables from `.env` / `.dev.vars`
- **Never hallucinate an API key** — always reference the actual env var populated in the project

### Feature Flags

- Use feature flags sparingly and in **as few places as possible** per flag. Do not scatter the same flag across multiple callsites — increases risk of undefined behavior.
- If the same flag must appear at multiple callsites, flag this for the developer to inspect carefully.
- Flag names must be **clear and descriptive**.
- In TypeScript, store flag names in an **enum**. In JavaScript, use a **const object** to simulate an enum.
- Enum/const members: `UPPERCASE_WITH_UNDERSCORE`.
- Gate flag-dependent code on a check that **verifies the flag's values are valid and expected**.

### Custom Properties

- If a custom property for a person or event is referenced in **2+ files or 2+ callsites** in the same file, use an enum or const object (same convention as feature flags).

### Naming (Events & Properties)

- **Before creating new names**, consult with the developer for any existing naming convention. Consistency in naming is essential — additional context may exist outside this project.
- **Be careful changing existing names** — this may break reporting and distort historical data.
- Similarly, be careful about changes to existing event and property names, as this may break reporting and distort data for the project.

## Provider Setup

Provider-specific setup — SDK, env vars, flag helpers, event helpers, session recording — belongs in
a **project** skill, because it is only correct in a repo that uses that provider. Keep the rules
above here; keep the wiring there.

## Extending This Skill in a Repo

If your project uses a specific provider (PostHog, Amplitude, Mixpanel, Google Analytics), add a
project skill that:

1. References this skill for the provider-agnostic "General Rules" — don't copy them
2. Holds that provider's setup, event tracking, and flag patterns — the wiring this skill deliberately does not carry

**Give it a different name** — `analytics-wiring`, `posthog-wiring`, whatever fits. A personal
(user-level) skill overrides a project skill of the same name, so a project `product-analytics` would
be silently shadowed by this one and never load. Distinct names mean both load, which is the point:
the agnostic rules *and* the repo's wiring. See
`~/.agents/templates/project-skills/README.md` for the copy-in procedure.
