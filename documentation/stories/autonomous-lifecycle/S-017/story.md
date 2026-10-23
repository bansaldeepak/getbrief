---
{
  _brief:
    {
      version: 1,
      record_id: ff1c1a5c-5079-4f2e-87da-af6859d44a73,
      item:
        {
          id: S-017,
          type: story,
          title: Autonomous lifecycle and explicit planning context,
          status: completed,
          branch: feature/autonomous-lifecycle,
          story: documentation/stories/autonomous-lifecycle/S-017/story.md,
          link: null,
          pr: null
        },
      legacy: { current_task: null, last_task: S-017-T3 }
    }
}
---
# S-017: Autonomous lifecycle and explicit planning context

**Status**: completed
**Branch**: feature/autonomous-lifecycle
**Created**: 2026-10-10

## Context

Apply the approved [PRD](../PRD.md) and [technical approach](../TRD.md) to shared brief sources.
User explicitly authorized implementation and cross-project availability on 2026-10-10.

## Goal
Fewer runtime questions through explicit planning, mode-aware execution, review before publication,
and reusable scoped learning, with safe global installation.

## Acceptance Criteria
- [x] Execution, review, and retro follow the approved policy.
- [x] Planning applies learned guidance and implementation checks it.
- [x] Active sources and isolated rollout tests pass; installed shared sources are verified.

## Scope
**In scope:** Lifecycle skills, agents, policy rules, provider adapters, active reference validation, safe rollout.
**Out of scope:** Remote push/PR/merge, unrelated project edits, historical cleanup, a new memory database.

## Execution Policy

- Mode: selective — explicitly selected by user in this conversation.
- Recommendation: selective because these shared rules control approvals and workflow behavior.
- Retro timing: before publication (approved PRD default).
- Policy-changing edits: authorized by the approved PRD; no repeated approval required within scope.
- Push/PR: not authorized; stop before remote publication.
- Global installation: authorized; sandbox escalation may still be required for home-directory writes.
- Verification: Node tests, source integrity, independent scenario checks, isolated installation, installed-source verification.
- Open clarifications: none; describeRoute message was confirmed accidental.
