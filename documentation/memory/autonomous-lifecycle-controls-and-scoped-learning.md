---
name: autonomous-lifecycle-controls-and-scoped-learning
description: Autonomous lifecycle controls and scoped learning
metadata:
  type: feedback
created: 2026-10-10
updated: 2026-10-10
valid_until: permanent
importance: 5
---

# Approved lifecycle controls and scoped learning

**Source:** User decisions approved on 2026-10-10 in [PRD](../stories/autonomous-lifecycle/PRD.md), [retro policy](../stories/autonomous-lifecycle/RETRO-POLICY.md), and [audit](../stories/autonomous-lifecycle/AUDIT.md). Technical application is recorded in [TRD](../stories/autonomous-lifecycle/TRD.md).
**Scope:** Explicitly shared brief lifecycle skills and their supported provider guidance. This authorizes the specified policy upgrade; it does not turn individual project design choices into global preferences.
**Status:** Explicitly decided. Source/shared installation verified on 2026-10-10; 7382850 is historical pre-rebase evidence. The rebased feature/autonomous-lifecycle branch was pushed at 02a3457 under explicit authorization. See [S-017 summary](../stories/autonomous-lifecycle/S-017/summary.md). No user application testing or merge is claimed. The separately authorized S-018 follow-up has its own publication and merge gates.

## Execution and ambiguity

- Before a story, recommend a mode from its risk and verification evidence, then retain the user's selection on resume. Strict asks before every commit; selective permits routine local commits and asks at critical/manual checkpoints; auto completes authorized local story work before publication approval.
- Recommend selective for migrations, critical behavior, or human browser verification, and auto for clear code-only work adequately covered by tests. Recommend strict when granular oversight or weak verification warrants it. Recommendation is not selection. The user selected selective for S-017 and separately for S-018. Neither establishes a future-story default; each needs its own selection or applicable explicit instruction.
- Every mode investigates ambiguity and asks if it remains unresolved before dependent work. Do not invent intended behavior, infer approval from silence, or re-ask an applicable settled choice. Migration execution still requires explicit approval independently of mode and code approval.

## Review, retro, and publication

- Review before push or opening a PR. Fix every confirmed introduced or worsened issue, including minor issues. Investigate unknown origin. Existing debt remains the user's fix-now/defer choice.
- Default order: task checks, review/fixes, retro and authorized guidance updates, review retro changes and final verification, publication approval, user testing, then separate merge approval.
- Explicit urgency can defer retro with recorded reason, consent, owner, source revision, and completion trigger. Preserve choices immediately even when retro is deferred. Use the open PR only while it remains open; after merge use a fresh branch from the current base and a linked follow-up PR through normal review and approval.
- Later changes require relevant review and verification plus new learnings where useful. Expand review when impact warrants it. Successful testing with no changes needs no repeated retro or bookkeeping commit.
- This timing supersedes the old timing in [historical retro-position feedback](feedback_lifecycle-retro-position.md). It does not reinstate the separately removed token-usage collection described there.

## Learning and planning

- Capture explicit design, naming, and functional choices immediately with source, stated scope, status, and supplied rationale. Do not invent rationale or infer policy from repeated observations. Ask before promoting beyond the stated scope.
- PRD, TRD, and tasks explicitly apply relevant choices, decisions, rules, skills, and agent guidance, with concrete design effects and unresolved questions. Resolve known questions before implementation so runtime work can follow settled decisions. Implementation and review still check current applicable rules.
- Retro and memory curation continue to perform already-authorized improvements to rules, skills, and agent instructions, verify their destinations and retrieval, and preserve supersession history. They must not reduce the improvement loop to suggestions or silently broaden authority.

**Rationale supplied by the user:** Clear requirements now allow more reliable model execution, reducing routine approval interruptions. Earlier review prevents late rework and new debt; completing retro before publication avoids losing learning when the user tests and merges quickly. Explicit planning recall reduces repeated implementation questions while retaining user control.

**How to apply and verify:** Start from [planning context](../../skills/brief/references/planning-context.md) and record relevant Applied Constraints in the next PRD/TRD/task. Check the [implementation policy](../../skills/brief/implement/SKILL.md), [review policy](../../skills/brief/pr-review/SKILL.md), [retro policy](../../skills/brief/retro/SKILL.md), [memory policy](../../skills/brief/memory/SKILL.md), and [self-improving procedure](../../agents/self-improving.md). Verify mode consent, scoped-choice application, finding disposition, current verification evidence, and any deferred-retro record before publication.
