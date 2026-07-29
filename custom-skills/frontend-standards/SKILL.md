---
name: frontend-standards
description: Framework-agnostic frontend architecture standards. Auto-applies when writing UI code — components, hooks, pages, routes, styling, or client state. Enforces composition over configuration, the component ownership ladder, data-fetching boundaries, styling tokens, accessibility, and rendering performance. Extends coding-standards; framework and design-system specifics live in project skills.
---

# Frontend Standards

Architecture rules for UI code in any framework. Examples are React, but the rules hold for Vue, Svelte, and Solid. File-size limits, reuse, naming, and type safety come from `coding-standards` — this skill covers only what is specific to building interfaces.

**The rule that matters most:** a UI file grows without limit unless something tells it where to stop. That something is the ownership ladder below, not willpower.

## 1. The Component Ownership Ladder

Every component sits on exactly one rung. The rung determines what it may import and what it may know.

| Rung | What it is | May know about | Must not |
|------|-----------|----------------|----------|
| **Primitive** | Headless behavior + minimal styling — button, dialog, popover, field | Nothing about your domain | Import feature code, fetch data |
| **Composed** | Primitives assembled into a reusable pattern — data table, form row, empty state | Generic shapes only | Reference a named business entity |
| **Feature** | Domain UI — `InvoiceRow`, `StudentProgressCard` | One domain concept | Own routing or page layout |
| **Route / Page** | Layout + data loading + composition of feature components | Everything below it | Contain business logic or bespoke markup |

**Build primitives by owning them, not installing them.** Copy-in components over a wrapped dependency: you get to fix a bug, change a token, or patch accessibility without waiting on a maintainer. Base the behavior on headless libraries (Radix, Base UI, Ark, Headless UI) so keyboard handling, focus traps, and ARIA are correct by construction rather than by review.

Do **not** organize folders by atoms/molecules/organisms. Classifying by size tells you nothing about who owns a file or what may import it; the ladder above classifies by dependency direction, which is the property that actually constrains change.

## 2. Composition Over Configuration

A component that grows a new prop for every variation is on its way to 3,000 lines. Every one of these is the same defect:

- A boolean prop that switches layout (`isCompact`, `showHeader`, `variant="modal"` gating structure)
- More than ~8 props on a presentational component
- A `renderX` prop, or props whose names describe markup (`headerTitle`, `headerIcon`, `headerAction`)
- Conditional JSX more than two branches deep

**The fix is always the same: hand the caller the slot instead of the flag.**

```tsx
// Configuration — every new case adds a prop and a branch
<Card title="Invoice" icon={<Bolt />} showFooter footerAction={<Pay />} isCompact />

// Composition — new cases add nothing
<Card>
  <Card.Header><Bolt /> Invoice</Card.Header>
  <Card.Body>…</Card.Body>
  <Card.Footer><Pay /></Card.Footer>
</Card>
```

Reach for compound components (shared context, dot-notation children) when parts must coordinate; plain `children` and slot props when they don't. Keep variant props for *styling* dimensions with a closed set of values (`size`, `tone`) — those are fine, and belong in a variant map, not in branching JSX.

## 3. File & Directory Rules

- **One exported component per file**, named identically to the file.
- **Colocate by feature, not by type.** `features/invoices/` holds its components, hooks, types, and tests. A top-level `components/` folder holds only rungs 1–2, which are feature-agnostic by definition.
- **A component's private subcomponents live beside it**, not inline. Past ~30 lines of nested JSX or the second use, a subcomponent gets its own file.
- **Extract a hook at the second use** — or the first, if it holds more than one `useState`/`useEffect` pair. Logic and markup have different reasons to change.
- **Never define a component inside another component's body** — it remounts its entire subtree on every render.

Limits come from `coding-standards` §1 (150 review / 250 split for UI files). Hitting them in a component almost always means one of: markup that should be a subcomponent, logic that should be a hook, or a page doing a feature component's job.

## 4. Data & State Boundaries

- **Fetch at the route boundary.** Loaders, route-level queries, or server components own data acquisition. A feature component receives data as props; it does not know where data came from.
- **Never fetch inside a rung-1 or rung-2 component.** That is what makes a component unreusable and untestable in one move.
- **Server state and client state are different things.** Cache, revalidation, and request status belong to a data layer (loaders, TanStack Query, RSC). `useState` is for ephemeral UI state — open/closed, focused, in-flight-locally.
- **Derive, don't duplicate.** State that can be computed from other state is a bug waiting to desync. No `useEffect` whose only job is to copy one state into another.
- **Lift state to the lowest common owner**, then stop. Global state is for genuinely cross-cutting concerns (session, theme, feature flags) and nothing else.
- **URL is state.** Filters, tabs, pagination, and selected IDs belong in the query string so views are shareable and restorable.

## 5. Styling

- **Tokens, never magic values.** Colors, spacing, radii, and type scale come from the design system. A raw hex or a one-off `13px` in a component is a defect.
- **Extract variants declaratively** — a variant map (`cva` or equivalent) rather than concatenated conditional class strings. Long ternaries inside `className` are unreadable and undiffable.
- **Style the primitive, not the instance.** If a caller needs to override internals to make it fit, the primitive's API is wrong.
- **Theme via CSS custom properties**, so light/dark and brand variation don't fork the component tree.

## 6. Accessibility (Baseline, Not Optional)

- Semantic elements first — a `<button>` before a `<div onClick>`; landmarks and heading order before ARIA.
- Every interactive element is keyboard reachable and has a visible focus style.
- Every input has a programmatically associated label; errors are linked via `aria-describedby`.
- Images carry meaningful `alt`, decorative ones carry `alt=""`.
- Motion respects `prefers-reduced-motion`.
- ARIA is a last resort — headless primitives (rung 1) exist so you rarely hand-roll it.

## 7. Rendering Performance

- **Measure before memoizing.** `memo`, `useMemo`, and `useCallback` added speculatively cost readability and buy nothing; add them against a profile, not a hunch.
- **Stable keys** — never an array index for a reorderable or filterable list.
- **Code-split at the route**, then at genuinely heavy widgets (editors, charts, maps).
- **Virtualize past ~100 rows.**
- **Keep expensive work out of render** — no sorting, filtering, or parsing of large collections inline in JSX.

## 8. What Belongs in a Project Skill Instead

This skill stays framework-agnostic. Push to a project-level `.claude/skills/` skill anything that is only true for one repo:

- Framework specifics — router conventions, loader/action patterns, RSC boundaries
- The design system in use and its component inventory
- Design tokens and theme configuration
- The chosen data layer and its conventions
- Build tooling, bundler config, and test setup

## Rules

- Composition over configuration — a new boolean prop that changes structure is a design smell
- Every component sits on exactly one rung and never imports upward
- Data is fetched at the route boundary and passed down
- One exported component per file, colocated by feature
- Extract a subcomponent or hook at the second use, not the fifth
- Tokens over magic values; variant maps over conditional class strings
- Accessibility is part of "done", not a follow-up ticket
- Memoize against a measurement, never a hunch
