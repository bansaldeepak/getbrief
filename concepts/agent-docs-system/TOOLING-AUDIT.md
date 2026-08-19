# Tooling & Skills Audit — always-on token cost

Companion to `PROPOSAL.md`. Answers the plugin/skill questions. All numbers measured, method noted.

---

## The headline

Your repo docs are **not** your biggest always-on cost. Your tooling is.

| Always-on load | Est. tokens/message | Source |
|---|---|---|
| **Skill listing (~120 skills)** | **~3,000** | 73 in `~/.claude/skills` + 75 plugin `SKILL.md` files. **Corrected 2026-07-19** from the plugin manager UI, which reports ~20–30 tok per skill. My first estimate of ~7,000 was ~2× too high. |
| `CLAUDE.md` + `AGENTS.md` + root `MEMORY.md` | ~6,200 | measured, see PROPOSAL.md §1.3 |
| Global `~/.claude/CLAUDE.md` | ~1,900 | user-level instructions |
| Caveman `SessionStart` hook output | ~700 (once/session) | hook injects full mode spec |
| MCP tool schemas | **~0** | already deferred — only names load, schemas fetched on demand |
| codegraph tools | ~100 | 8 deferred tool names |

**~15k tokens before you type anything.** Roughly half of that is skills you do not use.

Method note: skill-listing figure is estimated from the description text of every discovered `SKILL.md` (81 KB raw across all copies, ~20 KB after dedup to `~/.claude/skills`) plus the plugin skills visible in the session listing. Treat it as ±30%, but the ranking is not in doubt.

---

## Q1: Is codegraph earning its keep?

**Yes. Keep it.**

- Cost: its 8 tools are **deferred** — only names sit in context (~100 tokens). Schemas load only when used.
- Benefit: on a repo with 17 server modules and 43 Prisma models, `codegraph_impact` / `codegraph_callers` replaces the 5–15 file reads a blast-radius check normally costs. One avoided grep-and-read sweep pays for the whole year's context cost.
- Storage: 21 MB at `.codegraph/`, correctly gitignored (`.gitignore:221`). Not in anyone's clone.
- Already allowlisted in `~/.claude/settings.json` (`codegraph_files`, `codegraph_search`, `codegraph_status`), so it runs without prompts.

**One problem:** `.codegraph/.dirty` exists and the DB was last written 11:15 while the marker is newer. The index is stale relative to the working tree. A stale code graph is the same hazard as a stale doc — confident and wrong. Add a re-index step, or the tool becomes a liability rather than a saving.

**Verdict: keep, but wire re-indexing to a hook or a pre-work step.**

---

## Q2: Is caveman earning its keep?

**No, not on this workload. Recommend removing, or dropping to `lite`.**

The theory is sound — compress prose, save output tokens, and output tokens cost several times input. The problem is what a coding session actually emits.

- Caveman explicitly does **not** compress code blocks, commit messages, PR bodies, or quoted errors — by its own spec.
- It does not compress tool calls, file contents, diffs, or test output — the overwhelming majority of a coding session's tokens.
- What it does compress is my explanatory prose, which in a session like this one is maybe 10–15% of output.

So the realistic saving is ~10–20% of ~15% of output ≈ **2–3% of session cost**.

Against that:
- A `SessionStart` hook injects the full mode spec (~700 tokens) every session, plus the skill descriptions for `caveman`, `caveman-commit`, `caveman-review`, `caveman-help`, and `compress` in every message.
- The plugin is installed with **six duplicate copies** of its SKILL.md on disk (`marketplaces/caveman/{,.cursor/,.windsurf/,plugins/caveman/}`, `cache/caveman/...`), which is why it shows up repeatedly in the skill scan.
- The real cost is not tokens. It is that the output you most need to be precise — a risk warning, a migration caveat, a trade-off explanation — is the exact output caveman degrades. Its own spec has to carve out exceptions for security warnings and destructive operations, which is an admission that compression and correctness trade against each other.

**Verdict: remove.** If you like the terseness, the same effect costs zero tokens as one line in `AGENTS.md`: "Be terse. No preamble, no restating the question, no summary of what you just did."

---

## Q3: Skills audit

**73 skills in `~/.claude/skills`; 56 (77%) are gstack.** Plus 75 plugin skills.

Confirmed dead weight for *this* repo:

| Skill / plugin | Why it is waste here | Action |
|---|---|---|
| `rust-analyzer-lsp@claude-plugins-official` | Rust LSP. Zero `.rs` files in this repo. | **Uninstall** |
| `gstack-ios-clean`, `-ios-design-review`, `-ios-fix`, `-ios-qa`, `-ios-sync` | iOS. Verified zero `.swift` / `.xcodeproj` in repo. | **Remove (5)** |
| `superpowers@claude-plugins-official` v6.1.1 | **Still installed** — `installed_plugins.json`, last updated 2026-07-03. You believe you removed it; you did not. This is why `.superpowers/` and `docs/superpowers/` keep reappearing. | **Uninstall, then delete both dirs** |
| `caveman@caveman` (5 skills) | See Q2. | **Uninstall** |
| `gstack-benchmark-models`, `gstack-canary`, `gstack-design-shotgun`, `gstack-make-pdf`, `gstack-skillify`, `gstack-office-hours`, `gstack-plan-tune`, `gstack-diagram` | Niche; no evidence of use in this project's history. | **Disable, re-enable on demand** |
| `frontend-design@claude-plugins-official`, `warp@claude-code-warp` | Not referenced by your documented workflow in `~/.claude/CLAUDE.md`. | **Confirm then uninstall** |

Keep — these are the ones your global `CLAUDE.md` lifecycle actually names:

`prd`, `trd`, `project-plan`, `discover`, `review`, `retro`, `decision-doc`, `pre-mortem`, `memory-review`, `update-tracker`, `project-memory`, `feature-context`, `quality-check`, `coding-standards`, `db-safety`, `documentation-standards`, `hono-react-router-prisma-stack`, `new-module`, `product-analytics`, `skill-routing`.

That is 20 — close to your own estimate of 5–10 core plus their supporting cast.

**Expected saving: ~1,500–2,000 tokens per message** (revised down with the corrected per-skill figure), every message, for the life of the project. Real, permanent, and takes ten minutes — but *smaller* than the documentation win, not larger as I first claimed. Do it because it is cheap, not because it is the main event.

**Caveat, and it matters:** Vercel's eval (see PROPOSAL.md Phase 2) found skills were never invoked in 56% of cases even when relevant. So a skill you keep is not reliably a skill that fires. That argues for the same conclusion twice over — keep few skills, and put the rules you actually depend on in `AGENTS.md` where they load unconditionally.

---

## Phase 2 — external practice, verified

Your six starting findings, checked against current sources.

| # | Finding | Verdict |
|---|---|---|
| 1 | Stale doc worse than no doc | **Confirmed.** Doc drift is treated as a CI-detectable failure mode; "imperfect detection that runs on every merge beats perfect detection that never runs." |
| 2 | Explicit index in always-loaded file beats Skills | **Confirmed, exactly as you stated.** Vercel: 8 KB compressed docs index in AGENTS.md → 100% pass; skills → 79% ceiling, never invoked in 56% of cases, and no better than baseline without explicit instructions. |
| 3 | Keep always-loaded file small | **Confirmed.** HumanLayer's own production CLAUDE.md is under 60 lines; the widely-cited ceiling is ~200. Framing: CLAUDE.md is RAM, skills and docs are disk. |
| 4 | Long architecture overviews are low value | **Confirmed in principle**, though I could not find the specific deletion study. Consistent guidance: keep commands, constraints, and non-standard patterns; push architecture to lazily-loaded files. |
| 5 | Don't duplicate rules across files | **Confirmed** — and your repo is the proof (PROPOSAL.md §1.3, D1). |
| 6 | Three-tier progressive disclosure is standard | **Confirmed.** Now the explicit mechanic of the Skills spec (frontmatter → SKILL.md body → bundled files), adopted by Claude Code, Codex CLI, Cursor, Gemini CLI and Copilot. There is an open proposal (agents.md issue #135) to make progressive disclosure explicit in AGENTS.md v1.1. |

**Has anything replaced AGENTS.md / CLAUDE.md?** No. AGENTS.md consolidated as the cross-tool standard; CLAUDE.md remains Claude Code's entry point and is best used as a pointer to it. Your instinct is correct and is the current consensus.

**Is there a maintained drift-detection tool to adopt instead of hand-rolling?** Not for this job. The drift-detection tooling that exists is for API schemas and infrastructure (Terraform/OpenTofu). For docs specifically the only productised option is **Dosu**, which is commercial and aimed at stateful doc maintenance at scale. Nothing off-the-shelf validates a doc map's paths, commands and `verified_at` dates. **Hand-roll it** — it is ~80 lines of TypeScript running on your existing `.github/workflows/ci.yml`.

### Sources

- [Vercel — AGENTS.md outperforms skills in our agent evals](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
- [AGENTS.md v1.1 proposal — progressive disclosure (agentsmd/agents.md issue #135)](https://github.com/agentsmd/agents.md/issues/135)
- [The AGENTS.md Field Guide, 2026 edition](https://www.iuriio.com/blog/posts/2026/05/agents-md-field-guide-2026)
- [AGENTS.md vs CLAUDE.md — cross-tool context standards](https://hivetrail.com/blog/agents-md-vs-claude-md-cross-tool-standard)
- [Agent Skills: Progressive Disclosure as a System Design Pattern](https://www.newsletter.swirlai.com/p/agent-skills-progressive-disclosure)
- [Doc Drift Detection in CI: Catching Stale Docs on Every Merge](https://understandingdata.com/posts/doc-drift-detection-ci/)
- [CLAUDE.md Best Practices: The Complete 2026 Guide](https://maketocreate.com/claude-md-best-practices-the-complete-2026-guide/)
- [Optimizing AI Agents with Progressive Disclosure — Ardalis](https://ardalis.com/optimizing-ai-agents-with-progressive-disclosure/)
