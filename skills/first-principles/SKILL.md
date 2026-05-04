---
name: first-principles
description: "First-principles thinking for any problem. Break complex problems into fundamental truths and rebuild from there. Inspired by Elon Musk's engineering approach."
---

# First-Principles Thinking Skill

General-purpose problem decomposition. Applies to architecture, debugging, tradeoffs, simplification, optimization -- any problem where the surface answer isn't good enough.

**Auto-applies** when tackling complex or ambiguous problems. Not user-invocable -- woven into how you think.

## Core Method: Elon's 5-Step Engineering Process

Apply these IN ORDER. Most people jump to step 4 or 5. Don't.

### Step 1: Question the Requirement

> "The most common error is to optimize something that shouldn't exist."

Before solving anything, ask:
- **Who imposed this requirement?** (User? Legacy code? Assumption? Convention?)
- **Is this actually necessary?** Would anything break if we removed it entirely?
- **What problem was this ORIGINALLY solving?** Is that problem still real?
- **Are we solving a symptom or the disease?**

If a requirement came from a smart person, you're LESS likely to question it. That's the trap. Smart people create the hardest-to-question requirements.

### Step 2: Delete

> "If you're not occasionally adding things back, you're not deleting enough."

Before adding anything:
- What can be REMOVED entirely? (Code, features, steps, fields, configs)
- What complexity exists only because of historical accident?
- What are we doing "just in case" that never actually happens?
- If we built this from scratch today, would this part exist?

The best code is code that doesn't exist. The best process is no process. Delete first, add back only when something breaks.

### Step 3: Simplify

> "The best part is no part. The best process is no process."

After deleting, simplify what remains:
- Can two separate things become one?
- Can a configurable thing become hardcoded (if there's only ever one value)?
- Can an async flow become sync?
- Can a multi-step process become single-step?
- Can we use a simpler data structure?
- Is the abstraction earning its keep, or just adding indirection?

Rule: If explaining why something is complex takes longer than the thing itself, it's too complex.

### Step 4: Accelerate

ONLY after steps 1-3. Now optimize what survived:
- What's the bottleneck? (Measure, don't guess)
- Can we parallelize?
- Can we cache?
- Can we batch?
- Can we do it less often?

### Step 5: Automate

ONLY after steps 1-4. Automating a broken process just makes it fail faster:
- What manual steps remain?
- What repetitive decisions can become rules?
- What monitoring would catch problems before humans notice?

---

## Thinking Techniques

### 5 Whys (Root Cause)

Keep asking "why" until you hit bedrock:
```
Problem: API is slow
Why? → Sending too much data
Why? → Full conversation history in every request
Why? → History isn't bounded or filtered
Why? → Original design assumed short conversations
Why? → Built for single-profile, extended to multi-profile
ROOT CAUSE: Data model predates the current usage pattern
```

Stop when the next "why" would be "because that's how it was built" -- that's your root cause.

### Inversion (Work Backwards)

Instead of "how do we make this work?" ask:
- "What would guarantee this FAILS?"
- Then avoid those things.

Instead of "how do we reduce cost?" ask:
- "What's causing the MOST cost?"
- Then eliminate that specific thing.

### Constraint Removal

Ask: "If [constraint] didn't exist, what would we do?"
- If we had unlimited tokens, how would we design this?
- If latency was zero, what would change?
- If this was a greenfield project, would we build it the same way?

Then work backwards: which parts of that ideal design can we actually implement?

### Decomposition

Break any problem into independent sub-problems:
1. List all factors that contribute to the problem
2. For each factor, ask: "Can this be solved independently?"
3. Solve the independent ones first -- they're low risk and build momentum
4. The coupled ones often simplify once the independent ones are resolved

---

## When to Apply

- **Architecture decisions**: Step 1-3 before proposing any design
- **Debugging**: 5 Whys to find root cause before applying fixes
- **Performance**: Step 4 only (measure first, then optimize the bottleneck)
- **Refactoring**: Step 2-3 (delete, then simplify)
- **"We should add..."**: Step 1 (question whether it's needed at all)
- **Technical debt**: Inversion (what makes this worse? stop doing that)

## Rules

- Never optimize before simplifying
- Never automate before optimizing
- Never accept "that's how it works" as a reason
- Always measure before claiming something is slow/expensive/complex
- If you can't explain the problem simply, you don't understand it
- Prefer deleting code over adding code
- The goal is the simplest system that solves the actual problem
