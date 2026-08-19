# Open questions

Things I was not sure about. Answering these changes the design; guessing would have cost you more than asking.

---

## Q1 — Delete or archive the superseded `flow/` versions?

I recommended `git rm` in Step 2 and wrote the plan that way. You have not confirmed.

The argument for hard delete: an `archive/` folder is still greppable, still returns hits for "universal core", and still looks authoritative to an agent that lands in it from a search. Git history is a *better* archive precisely because it is not in the working tree. Your instinct ("rest all can be checked from git") matches this.

The argument against: `documentation/flow/v4` and `v5` are referenced by story files from that era. Those links break. Since stories are now a frozen log nobody reads for current truth, I judge broken links inside frozen history to be acceptable — but it is your call, and the drift check's link rule deliberately skips `stories/**` because of it.

**Assumed: hard delete.** Say so if you want `archive/` instead.

## Q2 — Should `memory/` be in the map?

Left out. It drifts like anything else — 37 files, several describing completed stories — but it is agent working memory, not repo documentation, and it has its own curation path (`/memory-review`, the `self-improving` agent).

Putting it in the map would subject it to `verified_at` and the same-PR rule, which I think is the wrong tool: memory is *supposed* to accumulate observations that were true at the time. The map's contract is "this is true now."

**Assumed: out of the map, curated separately.** Reasonable to disagree.

## Q3 — Which architecture docs are current?

I could not determine this from the files, and I did not guess.

`documentation/architecture/README.md` is titled "(v6)" (last commit 2026-07-17). `documentation/flow/v7/` exists (2026-06-29). Active work is on a v8 modular prompt (`documentation/prompts/v8-modular/`, `memory/project_v8_modular_prompt.md`). Three generation numbers, three directories, no stated relationship.

`architecture/session/01-09` I have mapped as the tier-2 session node on the basis that `05-live-session.md` was committed 2026-07-19 — but `01`, `02`, `03`, `06`, `07`, `08` are all 2026-05-08 and may describe superseded behaviour.

**I need you to tell me which of these is current before `map.yaml` ships**, because a `verified_at` I invented is worse than no map at all. Everything in `map.yaml.draft` carries `verified_at: 2026-07-19` for nodes I could corroborate against recent commits, and the real last-commit date otherwise — but none of those dates represents an actual human verification, which is what the field is supposed to mean.

## Q4 — Is `documentation/architecture/engagement.md` mine to create?

`map.yaml` has an `engagement` node pointing at a file that does not exist. The content exists, scattered across `stories/engagement-pipeline/TRD.md`, `stories/game-engine/TRD.md`, and `app/server/modules/{game,engagement}/README.md`. Consolidating it is a real writing task (a few hours), not a move.

Options: (a) I write it during implementation, (b) drop the node and let games/FSRS work route to `architecture/session/`, (c) point the node at the module READMEs as-is.

**No assumption made.** (b) is cheapest and I lean toward it.

## Q5 — What is `TODOS.md` for?

204 lines, last commit 2026-07-13, and **nothing declares when an agent should read it**. It is not referenced from `CLAUDE.md`, `AGENTS.md`, or any `.cursor` rule. It may be a personal scratchpad, in which case it should be gitignored; or a real backlog, in which case it overlaps `PROJECT-TRACKER.md` and one of them should win.

I left it untouched and out of the map.

## Q6 — `documentation/audits/` vs the audit content inside stories

After merging `audit/` into `audits/` (Step 2), the directory holds nine one-off analyses from 2026-06/07. Several read like story artefacts that escaped `stories/`. I did not map them. If they are historical, they belong under `stories/` or deleted; if any is a living reference, tell me which and I will add a node.

## Q7 — Does the same-PR rule survive contact with your workflow?

You mentioned workflow upgrades are coming later. The same-PR rule assumes one PR per unit of work. Your actual convention is **one task = one commit**, several tasks per story, and PRs that span a whole story.

At commit granularity the rule is unenforceable in CI (checks run per-PR). At PR granularity it is enforceable but coarser — a doc could be stale for six commits inside a PR and still pass. I wrote the check at **PR granularity**, which I believe matches your process, but it means the rule's wording in `AGENTS.md` ("in the same PR") is deliberately weaker than the ideal ("in the same commit").

Flagging because you said workflow changes are coming: if tasks start becoming their own PRs, tighten this.

## Q8 — Code comments

You raised that code should carry proper comments and that this is a later workflow upgrade. I have **not** designed for it and it is not in the map or the migration plan.

Worth saying now: `AGENTS.md:31` already mandates TSDoc on all exported functions/interfaces/types in `.ts` (`.tsx` and tests exempt), and `eslint-plugin-jsdoc` + `eslint-plugin-tsdoc` are installed. So the rule and the tooling both exist. I did not check enforcement level in `eslint.config.js` — whether it is `error`, `warn`, or configured but not switched on. That check is ten minutes and would tell you whether this is a missing rule or an unenforced one. Say the word and I will look.
