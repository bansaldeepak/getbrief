# Agent Discipline

Recurring verification traps. These patterns have caused bugs across multiple stories — internalize them.

## Verification rules

**Absence is not proof.** A grep that returns nothing proves the pattern wasn't found — not that the thing doesn't exist. Check: could the evidence appear in a different form, casing, location, or file type? Applies to symbol names, config keys, and expected outputs.

**A check that cannot fail looks like one that passes.** Every filter, guard, or validation needs a negative test proving it goes red. A dead glob, ignored file, over-broad pattern, or stale discriminator all produce a silent green. If you can't make it fail, it isn't checking anything.

**A task file's claims are unverified.** Task specs written during planning assert things about current code ("X already does Y", "the function takes Z"). These are hypotheses, not facts. Check every such claim against the actual codebase before implementing — a wrong premise in task N becomes a design decision in task N+3.

**Trace before attributing.** A measurement localises a symptom; blaming a component is a claim about topology. Trace the actual call path before concluding which layer owns the bug.

## Workflow rules

**Ask fix-now-vs-defer, don't assume.** When live testing surfaces a gap that's in the current story's blast radius, ask the user whether to fix inline or defer. Don't silently punt.

**Self-contained specs for handoff.** A spec handed to another agent must inline its code context, schema, and decisions. A link is not context — the receiving agent has no history.
