---
description: Store Clerk isSignedIn/getToken in refs to avoid recreating callbacks on auth state transitions
globs: ["app/client/**/*.tsx", "app/client/**/*.ts"]
---

# Clerk Auth State — Use Refs in Callbacks

Never put `isSignedIn` or `getToken` directly in `useCallback` dependency arrays. Instead, store them in refs and read the latest value inside the callback:

```tsx
// BROKEN — auth transitions undefined→false→true on mount, recreating callback 2-3×
const load = useCallback(async () => {
  if (!isSignedIn) return;
  const token = await getToken();
  // API call...
}, [isSignedIn, getToken, ...otherDeps]);

// CORRECT — stable callback, reads latest auth via refs
const isSignedInRef = useRef(isSignedIn);
isSignedInRef.current = isSignedIn;
const getTokenRef = useRef(getToken);
getTokenRef.current = getToken;

const load = useCallback(async () => {
  if (!isSignedInRef.current) return;
  const token = await getTokenRef.current();
  // API call...
}, [...otherDeps]); // omit isSignedIn and getToken
```

**Why:** Clerk resolves auth state asynchronously on mount (`undefined → false → true`). Each state transition causes the callback to be recreated, which re-fires any `useEffect` depending on that callback — resulting in 2–3 duplicate API calls per page load. Not visible locally (fast network), but very visible on deployed edge (~500ms per call).

**How to apply:** When a `useCallback` contains a call to `isSignedIn()` or `getToken()` and that callback is used as a dependency in a `useEffect`:
1. Create refs for `isSignedIn` and `getToken`
2. Update the refs in the component body (outside the callback)
3. Read from refs inside the callback
4. Remove `isSignedIn` and `getToken` from the callback's dependency array
5. Keep other legitimate dependencies (query keys, page state, etc.)
