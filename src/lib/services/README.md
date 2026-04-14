# Services

Transactional, reusable business operations. One public function per use
case. All writes go through here — not through API routes or directly
from server actions.

## Shape

- Services **throw `AppError`** on failure; they never return `{ok:false}`.
  Server actions catch and adapt to the existing action-result shape.
- Services **do not revalidate paths**. Revalidation is a UI concern — the
  caller (action) owns it via helpers in `src/lib/revalidation.ts`.
- Services **do not call `requireAuth()`**. The caller passes the already-
  authenticated `AuthedUser`. This keeps services usable from cron jobs,
  webhooks, and future mobile/GraphQL clients.

## Why this layer exists

Before: transaction bodies lived inside `"use server"` files, only
reachable via form POSTs. Webhooks and cron jobs would have had to
duplicate the SQL.

After: the action is a thin shell; the service owns the atomic write.
