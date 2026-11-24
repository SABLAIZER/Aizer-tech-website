# Firestore Security Specification

## 1. Data Invariants
1. Every document across all collections must have a valid alphanumeric/dash/underscore ID (`<= 128` chars).
2. **Strict Must-Login Enforcement**: Zero guest requests, zero guest bookings, zero guest chats. Creating documents in `/aizertech_messages`, `/contactMessages`, `/aizertech_bookings`, or `/aizertech_chats/{userId}/messages` requires `request.auth != null && request.auth.token.email_verified == true` and `userId == request.auth.uid` (or `senderId == request.auth.uid`).
3. **`/aizertech_users/{userId}`**: PII-isolated user registry. Only the owning user (`request.auth.uid == userId && email_verified`) or verified admin may `get` or `create`/`update`; only verified admin may `list`. `uid`, `email`, and `firstLoginAt` are immutable once created, and `totalRequests` may only increment by `<= 1` per update by the owner.
4. **`/aizertech_visits/{visitId}`**: Write-once visitor analytics log (`allow create` for public website traffic; `allow update: if false;`), strictly readable (`get`, `list`) and deletable only by verified admin.
5. **`/aizertech_chats/{chatUserId}` & `/messages/{chatMsgId}`**: Master Gate enforced so clients may read/write only their own thread (`request.auth.uid == chatUserId`) and messages cannot be spoofed with `senderRole: 'admin'` by non-admins.
6. **`/aizertech_invoices/{invoiceId}`**: Writable/deletable strictly by verified admin (`amountGhs >= 0`, `status in ['unpaid', 'paid']`); readable (`get`, `list`) by verified admin OR the owning client whose verified `request.auth.token.email` matches `clientEmail`.
7. **`/aizertech_testimonials/{testimonialId}`**: Public `get`/`list` strictly when `approved == true`; admin-only CRUD.
8. **`/aizertech_draft/website`, `/aizertech_backup/{backupId}`, `/studioProjects/{projectId}`**: Strictly admin-only.

## 2. Adversarial Payloads ("Dirty Dozen+")
1. Unauthenticated guest `create` on `/aizertech_messages` or `/aizertech_bookings` -> `PERMISSION_DENIED`
2. Unauthenticated `create` on `/aizertech_chats/{uid}/messages` -> `PERMISSION_DENIED`
3. Authenticated user `get` or `list` on `/aizertech_users` belonging to another user -> `PERMISSION_DENIED`
4. Authenticated user `create` on `/aizertech_users/{otherUid}` (UID spoofing) -> `PERMISSION_DENIED`
5. Authenticated user `update` on `/aizertech_users/{uid}` forging `totalRequests: 9999` or mutating `firstLoginAt` -> `PERMISSION_DENIED`
6. Unauthenticated `list` or `get` on `/aizertech_visits` -> `PERMISSION_DENIED`
7. Visitor `update` on `/aizertech_visits/{id}` trying to alter an existing daily visit -> `PERMISSION_DENIED`
8. Non-admin `create` in `/aizertech_chats/{uid}/messages` with `senderRole: 'admin'` -> `PERMISSION_DENIED`
9. Authenticated client `list` on `/aizertech_invoices` without matching `clientEmail == request.auth.token.email` -> `PERMISSION_DENIED`
10. Authenticated non-admin `create` on `/aizertech_messages` with `userId` set to another user's UID or `status: 'paid'` -> `PERMISSION_DENIED`
11. Unverified email claiming admin (`email_verified: false`) writing to `/aizertech_invoices` -> `PERMISSION_DENIED`
12. Visitor `create` on `/aizertech_visits` with shadow field `isAdmin: true` or forged `createdAt` -> `PERMISSION_DENIED`
