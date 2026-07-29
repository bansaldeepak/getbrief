---
name: skills-cli-local-sources
description: The skills CLI copies local-path skills instead of symlinking them, which is why setup.sh still owns custom-skills
type: reference
created: 2026-07-29
updated: 2026-07-29
valid_until: 2026-11-29
importance: 3
---

`npx skills add ./local-dir` **copies**; it does not symlink. Verified by installing a throwaway
skill in both scopes on 2026-07-29 — output says `✓ demo-skill (copied)`.

| | Remote (`owner/repo`) | Local path |
|---|---|---|
| `~/.agents/skills/<name>` | created (canonical) | **not created** |
| `~/.claude/skills/<name>` | symlink → canonical | **real copied directory** |
| Codex | nothing needed — reads `$HOME/.agents/skills` natively | **nothing** — no canonical dir exists to read |
| Lock entry | full provenance + hash | none in `~/.agents/.skill-lock.json` (project scope does record `sourceType: local` + `computedHash`) |

`--copy` forces copying for remote sources; there is **no inverse flag** to force linking for local.

**Why this settles it:** `setup.sh` links `custom-skills/*` so the git-tracked file *is* what both
agents read — edit it and the next turn sees it. Under the CLI those become copies, so a forgotten
re-run means agents silently read stale standards with nothing failing, and Codex gets the skills
not at all. The CLI keeps what it is good at: third-party skills with upstream provenance
(`gstack`, `shadcn-ui`).

Revisit if these skills need to reach a second machine or another person — that is distribution,
which *is* the CLI's job, and the route is publishing `custom-skills/` as a repo and adding it
remotely. Cost of that route: the canonical copy is a clone, so iterating means push → update.

Related: [[cross-reference-drift]], [[standards-split]].
