---
name: test-template-injection-for-heading-duplication
description: When injecting templates with markdown headers, test for heading duplication — prefix + template h1 can create doubles
metadata:
  type: feedback
created: 2026-09-01
updated: 2026-09-01
valid_until: permanent
importance: 4
---

## Rule

When injecting markdown templates (especially headers), write tests that assert no heading duplication. A prefix string + template h1 can double the heading.

**Why:** In S-012 harness.mjs, markers were generated as `<!-- brief:auto section="harness" version="0.2.0" ... -->` followed by template content. The template `templates/HARNESS.md` started with `# Brief Workflow`. When rendering, the system added another `## Brief Workflow` prefix, creating duplicate headings. This was not caught by unit tests because the test only checked that markers existed and content was present — not that it was well-formed markdown.

**How to apply:**
1. Before writing template injection code, write a test that:
   - Renders the template with a prefix/marker
   - Parses the result as markdown
   - Asserts no heading appears twice
   - Example: `const headings = result.match(/^#+\s/gm); assert(new Set(headings).size === headings.length, "duplicate headings found")`
2. This test should fail on first run (catch the bug early)
3. Then implement injection to pass the test

Related pattern: [[test-template-injection-for-heading-duplication]] — marker-based merge tests.
