---
description: CSS conditional classes must use full-string ternary — Prettier strips leading space from template literal interpolations
globs: ["**/*.tsx"]
---

# CSS Conditional Classes — Full-String Ternary Required

Always use full-string ternary for conditional CSS classes, never template literal interpolation:

```tsx
// CORRECT — Prettier-safe
className={cond ? "base modifier" : "base"}

// BROKEN — Prettier strips the leading space inside interpolation
className={`base${cond ? " modifier" : ""}`}
```

After reformatting, the broken pattern produces `"basemodifier"` (classes concatenated without space), which matches no CSS selector and causes silent layout breakage.

**Why:** Prettier reformats template literals and strips whitespace before interpolated values. This happened 3 times in S-050 (ResultsPanel, GameClient ×2, GameTimer) — the layout only broke in the browser, not in editor previews.

**How to apply:** Any time writing a conditional CSS class:
1. Use full-string ternary: `condition ? "class1 class2" : "class1"`
2. For multiple conditions, nest ternaries or use a helper like `clsx()`
3. Test formatting by running `npm run check` and visually inspecting styled output

**Reference implementation**: See S-050 branch commits for ResultsPanel and GameClient fixes.
