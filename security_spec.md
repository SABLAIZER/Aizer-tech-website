# Firestore Security Specification

## 1. Data Invariants
1. Every document under `/contactMessages/{messageId}` must have a valid alphanumeric/dash/underscore `messageId` (`<= 128` chars).
2. Incoming contact messages can be created by visitors, **only** with `status == 'new'`, exact allowed keys (`hasAll` + `hasOnly`), validated lengths, valid email format, and server timestamps (`createdAt == request.time`, `updatedAt == request.time`).
3. PII Isolation: `senderEmail`, `senderPhone`, and `message` are strictly private. Only verified studio administrators (`sablahevans0@gmail.com` with `email_verified == true`) may `get`, `list`, `update`, or `delete` contact messages.
4. Updates to `/contactMessages/{messageId}` by an admin may only mutate `status` and `updatedAt` (with `updatedAt == request.time`). Original message content and `createdAt` remain immutable.
5. `/admins/{adminId}` cannot be written from client SDKs; only verified admins can `get` their own or admin records.

## 2. Adversarial Payloads ("Dirty Dozen")
1. Unauthenticated `list` on `/contactMessages` -> `PERMISSION_DENIED`
2. Authenticated non-admin `get` on `/contactMessages/{id}` -> `PERMISSION_DENIED`
3. Unverified email claiming `sablahevans0@gmail.com` (`email_verified: false`) reading `/contactMessages` -> `PERMISSION_DENIED`
4. Contact message create with shadow field `isAdmin: true` -> `PERMISSION_DENIED`
5. Contact message create with pre-set `status: 'replied'` instead of `'new'` -> `PERMISSION_DENIED`
6. Contact message create with forged `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`
7. Contact message create with 50KB `message` string -> `PERMISSION_DENIED`
8. Contact message create with malformed `senderEmail` -> `PERMISSION_DENIED`
9. Contact message create with invalid `serviceType` enum -> `PERMISSION_DENIED`
10. Contact message create with invalid `messageId` containing spaces or >128 chars -> `PERMISSION_DENIED`
11. Admin update attempting to alter `senderEmail` or `message` -> `PERMISSION_DENIED`
12. Non-admin attempting to write `/admins/{uid}` -> `PERMISSION_DENIED`
