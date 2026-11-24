# Firestore Security Specification

## 1. Data Invariants
1. Every document under `/contactMessages/{messageId}` and `/aizertech_messages/{messageId}` must have a valid alphanumeric/dash/underscore `messageId` (`<= 128` chars).
2. Incoming client inquiries on both `/contactMessages/{messageId}` and `/aizertech_messages/{messageId}` can be created by visitors, **only** with `status == 'new'`, exact allowed keys (`hasAll` + `hasOnly`), validated lengths, valid email format, and server timestamps (`createdAt == request.time`, `updatedAt == request.time`).
3. PII Isolation: client emails, phones, and messages are strictly private. Only verified studio administrators (`sablahevans0@gmail.com` or `sablaizer@gmail.com` with `email_verified == true`) may `get`, `list`, `update`, or `delete` contact messages.
4. Updates to `/contactMessages/{messageId}` and `/aizertech_messages/{messageId}` by an admin may only mutate `status` (within `['new', 'reviewed', 'replied', 'done', 'archived']`) and `updatedAt` (`== request.time`).
5. `/studioProjects/{projectId}` is strictly private to verified studio administrators (`get`, `list`, `create`, `update`, `delete`).
6. Website Control CMS Safety:
   - `/aizertech_draft/website` is strictly private to verified studio administrators (`get`, `create`, `update`); visitors cannot read drafts.
   - `/aizertech_live/website` is readable (`get` only, `list` and `delete` denied) by all visitors to render live website content; only verified admins may write it with validated CMS structure and `updatedAt == request.time`.
   - `/aizertech_backup/{backupId}` stores immutable pre-publish snapshots accessible only to verified admins (`get`, `list`, `create`, `delete`; `update` denied).
7. `/admins/{adminId}` cannot be written from client SDKs; only verified admins can `get` admin records.
8. `/studioSettings/public` is publicly `get`-readable and admin-writable with validated schema.

## 2. Adversarial Payloads ("Dirty Dozen+")
1. Unauthenticated `list` on `/contactMessages` or `/aizertech_messages` -> `PERMISSION_DENIED`
2. Authenticated non-admin `get` on `/aizertech_draft/website` -> `PERMISSION_DENIED`
3. Unauthenticated `list` or `get` on `/aizertech_backup` -> `PERMISSION_DENIED`
4. Unauthenticated or non-admin write to `/aizertech_live/website` -> `PERMISSION_DENIED`
5. Unauthenticated `list` on `/aizertech_live` or `get` on `/aizertech_live/other` -> `PERMISSION_DENIED`
6. Unverified email claiming admin (`email_verified: false`) reading `/aizertech_draft/website` -> `PERMISSION_DENIED`
7. Inquiry create with shadow field `isAdmin: true` -> `PERMISSION_DENIED`
8. Inquiry create with pre-set `status: 'done'` instead of `'new'` -> `PERMISSION_DENIED`
9. Inquiry create with forged `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`
10. Admin update attempting to alter `/aizertech_backup/{id}` (append-only backup integrity) -> `PERMISSION_DENIED`
11. Non-admin access to `/studioProjects/{id}` -> `PERMISSION_DENIED`
12. Admin write to `/aizertech_live/website` with invalid `hero.email` or extra unapproved top-level key -> `PERMISSION_DENIED`
