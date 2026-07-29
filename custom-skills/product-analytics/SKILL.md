---
name: product-analytics
description: Product analytics and feature flag conventions. Default provider is PostHog. Auto-applies when working with analytics, feature flags, custom events, or user tracking. Projects may override with a local product-analytics skill for a different provider.
---

# Analytics Conventions

Universal analytics rules. Default provider: **PostHog**. Override this skill at the project level if using a different analytics provider.

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

## PostHog (Default Provider)

### Frontend Setup

- SDK: `posthog-js` + framework-specific wrapper (e.g., `@posthog/react`)
- Initialize in the app root with env vars: `VITE_POSTHOG_KEY` / `VITE_PUBLIC_POSTHOG_KEY`, `VITE_POSTHOG_HOST` / `VITE_PUBLIC_POSTHOG_HOST`

### Feature Flags (PostHog)

```typescript
// Use an enum for flag names
export enum FeatureFlag {
  NEW_ONBOARDING = "NEW_ONBOARDING",
  PREMIUM_FEATURES = "PREMIUM_FEATURES",
}

// Gate code on flag value
if (posthog.isFeatureEnabled(FeatureFlag.NEW_ONBOARDING)) {
  // feature code
}
```

### Custom Events

```typescript
posthog.capture("event_name", {
  property_key: value,
});
```

### Session Recordings

- Enable in PostHog dashboard, not in code
- Respect user privacy settings

## Overriding This Skill

If your project uses a different analytics provider (e.g., Amplitude, Mixpanel, Google Analytics),
create a project skill at `<repo>/.claude/skills/product-analytics/SKILL.md` that:

1. References this skill for the provider-agnostic "General Rules" — don't copy them
2. Replaces the "PostHog" section with that provider's setup, event tracking, and flag patterns

A project skill of the same name takes precedence over this one. See
`~/.agents/templates/project-skills/README.md` for the copy-in procedure.
