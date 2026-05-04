---
description: Clerk userId is NOT the Prisma User UUID — always resolve via vendorId
globs: ["app/server/**/*.ts"]
---

# Clerk userId → Prisma User Resolution

`c.get("userId")` returns the Clerk JWT subject — this is NOT the Prisma `User.id` UUID.

**Always resolve via `vendorId` lookup before any Prisma query that needs the user record:**

```ts
const clerkUserId = c.get("userId");
const user = await prisma.user.findUnique({ where: { vendorId: clerkUserId } });
if (!user) throw new HTTPException(404, { message: "User not found" });
// now use user.id for all Prisma relations
```

**Reference implementation**: `app/server/modules/family/routes.ts` (`resolveCurrentUser`)
