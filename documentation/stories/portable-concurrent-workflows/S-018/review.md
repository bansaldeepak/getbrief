# S-018 local review

Base: `02a345763f40fb1adbacf096c911a86d88060bc5`. Implementation candidate: `29794a2`, with final init-report correction `5a22552`.
Two independent read-only fallback reviewers covered record/concurrency and installation scopes,
then re-reviewed corrections. Named reviewer deployment was unavailable (404). No tests were
claimed by reviewers; execution evidence is in [summary](summary.md).

| Finding | Origin/severity | Resolution and verification |
|---|---|---|
| REC-01 | Introduced/important | Pending migration blocks both legacy and record authority; interruption-before-marker/rollback regression. |
| REC-02 | Introduced/important | Complete metadata is encoded before exclusive atomic publication; overwrite refusal and complete-record checks. |
| REC-03 | Introduced/important | Migration requires inventory/mapping equality and validates stored canonical paths; unmapped-path regressions. |
| REC-04 | Introduced/important | Base-aware checks require new task identities and reject changes/removal; record identities are also checked. |
| REC-05 | Introduced/minor | Actual conflict blocks fail while valid Setext headings remain readable. |
| REC-06 | Introduced/minor | Exact prior mode is applied to temporary files before rename, including group-write under restrictive umask. |
| PORT-01 | Introduced/important | Global-selected projects remove owned legacy local links, reject foreign overrides; doctor checks project routing. |
| PORT-02 | Introduced/important | Re-init does not refresh lifecycle harness from the running CLI; selected package/instructions remain pinned. |
| PORT-03 | Introduced/important | Pending transactions block init before mutation; all scaffold/memory/rule leaves are preflighted and files journaled. |
| PORT-04 | Introduced/important | Dry-run shows installed/candidate provenance and unified content diffs before apply. |
| PORT-05 | Worsened/important | Existing modes preserved; new global files/journals private; intended permissions established before atomic rename. |
| PORT-06 | Introduced/important | Re-init retains original provenance instead of adopting customized bytes; subsequent upstream replacement still conflicts. |
| LOG-COMPAT | Worsened/important | Historical unquoted notes bypass new-schema parsing; base diff still guards every historical mutation. Old bytes unchanged. |
| INIT-REPORT | Introduced/minor | Re-init reports directories created in the actual project, not its staging tree; affected portable suite 13 passed. |
| SCOPE-DOC | Introduced/minor | Setup asks fresh scope/reuses prior selection; bundle artifact explicitly local-only. Direct planning reads the contract. |

Every confirmed introduced/worsened issue was corrected and affected behavior tested. No unrelated
pre-existing debt was changed or waived. Full suite: 280 passed; affected portable suite after final correction: 13 passed; source/metadata checks, real-repo
record verification and 30 isolated global registrations passed. Final record-only changes receive
factual/reference review without repeating unrelated executable tests.

Verdict: ready for local handoff after retro/curation and final record checks. Publication/merge
remain separate user-controlled steps; this review does not authorize either.
