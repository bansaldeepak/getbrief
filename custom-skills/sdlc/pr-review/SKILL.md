---
name: pr-review
description: "Code review before PR/merge. Structured review covering correctness, security, performance, tests, and docs. Human approval gate before merge."
user_invocable: true
model: opus
---

# /sdlc pr-review -- Code Review

Structured code review that runs before creating a PR or merging. Catches issues across correctness, security, performance, and standards compliance.

**Usage**: `/sdlc pr-review` (reviews current branch changes) or `/sdlc pr-review <branch-name>`

**Source**: Adapted from NeoLabHQ subagent-driven-development review pattern.

## When Claude Should Auto-Invoke

- Before creating a PR (`gh pr create`)
- When all story tasks are complete
- Ask user: "All tasks are done. Running code review before PR."

## Human Approval Gate

**Merge requires explicit human approval.** Present review findings and ask: "Review complete. Ready to create the PR?"

## Instructions

### Phase 1: Gather Changes

```bash
# Get the diff against the base branch
git diff main...HEAD --stat
git diff main...HEAD
git log main..HEAD --oneline
```

Read all changed files completely — don't just look at diffs.

### Phase 2: Review Checklist

Invoke the `reviewer` agent to analyze changes. The review covers:

#### Correctness
- [ ] Logic is correct — no off-by-ones, null refs, race conditions
- [ ] Edge cases handled — empty inputs, max values, concurrent access
- [ ] Error handling is appropriate — no swallowed errors, proper HTTP codes
- [ ] Types are correct — no `any` casts, proper generics

#### Security
- [ ] No secrets in code (API keys, passwords, tokens)
- [ ] Input validation at system boundaries
- [ ] Auth/AuthZ checks present where needed
- [ ] No SQL injection, XSS, CSRF vectors
- [ ] OWASP top 10 considered

#### Performance
- [ ] No N+1 queries
- [ ] No unnecessary re-renders (React)
- [ ] Large datasets paginated
- [ ] Expensive operations cached or deferred

#### Tests
- [ ] New code has tests
- [ ] Tests cover happy path AND error cases
- [ ] Tests are meaningful (not just coverage padding)
- [ ] Existing tests still pass

#### Standards
- [ ] Follows project coding standards
- [ ] Naming is consistent with codebase
- [ ] No dead code or commented-out blocks
- [ ] Documentation updated where needed

#### Architecture
- [ ] Changes align with PRD/TRD (if they exist)
- [ ] No unintended scope creep beyond the story
- [ ] Design decisions documented

### Phase 3: Findings Report

Categorize findings by severity:

```markdown
## Review Summary

**Branch**: <branch-name>
**Changes**: <N files changed, +X/-Y lines>
**Story**: <S-NNN if applicable>

### 🔴 Critical (must fix before merge)
- <finding with file:line reference>

### 🟡 Important (fix before next task)
- <finding with file:line reference>

### 🔵 Minor (note for future)
- <finding with file:line reference>

### ✅ What looks good
- <positive observations — reinforce good patterns>
```

### Phase 4: Resolution

- **Critical findings**: Fix immediately, re-review
- **Important findings**: Fix in a follow-up commit on the same branch
- **Minor findings**: Note in PR description or create a follow-up issue

### Phase 5: PR Creation

After all critical/important findings are resolved:
- Run quality gates (typecheck, lint, test, build)
- Create PR with `summary.md` content as description
- Ask user: "PR ready for your review. Approve and merge?"

## Rules

- Never skip review — even for "small" changes
- Read full files, not just diffs — context matters
- Critical findings block merge — no exceptions
- Always highlight positive patterns (not just problems)
- Reference specific file:line for every finding
- If the review is clean, say so — don't manufacture issues
