# S-017 Retrospective

**Story and covered revision:** S-017, source through `7382850`; final documentation and curation
are recorded separately. Base `5ea7a12` excludes unrelated earlier branch work.
**Timing/status:** complete before any Git push/PR. Shared installation was explicitly authorized
and completed; no remote publication, user application test, or merge is claimed.

## Planned vs Delivered

Delivered all three tasks: selectable execution modes, explicit planning and scoped learning,
review/retro before publication, and safe shared distribution. Both existing defects identified
during review were fixed with the user's explicit approval. No new memory service was introduced.

## What Worked / What Did Not

Independent behavioral evaluation tested six concrete decision cases. Independent policy and
installer review exposed real gaps; every introduced finding, including minor diagnostics loss,
was corrected and re-reviewed. Tests against temporary installations prevented custom-content
rewrites and predictable partial writes from reaching the actual host configuration.

The old distribution assumed a missing root harness and included a dangling global skill link.
Source ownership, a managed provider block, backups, and installed-source checks now replace that
path. Unsupported provider tool controls remain disclosed approximations. Static checks and six
reasoning traces do not prove every future agent follows the policy.

## User Choices and Applied Learning

Source: this conversation and approved [PRD](../PRD.md), [retro policy](../RETRO-POLICY.md).
Scope: shared Brief lifecycle policy; selective mode applies to this story. Choice scope remains
explicit for future feature/project preferences; broader promotion requires user approval.

Authorized rules, skills, agent definitions, planning inputs, and provider mappings were actually
updated and verified. New planning explicitly consumes scoped knowledge; implementation rechecks
current guidance. Review addresses finding origin before deciding whether anything may be deferred.

Memory curation inventoried 16 records and added one permanent scoped feedback record,
[lifecycle controls](../../../memory/autonomous-lifecycle-controls-and-scoped-learning.md).
The old retro timing was superseded with replacement links; its original rationale and independent
token-tracking removal remain intact. The store now has 17 records, none deleted or retired.
MEMORY.md gained the new pointer, labels the old pointer historical, and uses the correct CLI flag.
The curator verified planning and execution consumers. No broader promotion or unresolved choice
remains; future project-specific preferences retain their own scope.

## Verification and Follow-up

248 Node tests pass; all 14 skill metadata checks and 55 active-source reference checks pass.
All 30 installed registrations match; custom provider text was independently checked unchanged.
See [validation](../VALIDATION.md) for the evidence and validator/provider limitations.

No required implementation follow-up remains. Owner: the next agent/user invoking Brief; trigger:
real future usage or post-publication findings. Record new evidence incrementally, including any
host/resume behavior not covered by the six evaluated cases. No unattended work is promised.
