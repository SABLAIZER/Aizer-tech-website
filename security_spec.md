# Firestore Security Specification

## 1. Data Invariants
1. Every document under `/contactMessages/{messageId}` and `/aizertech_messages/{messageId}` must have a valid alphanumeric/dash/underscore `messageId` (`<= 128` chars).
2. Incoming client inquiries on both `/contactMessages/{messageId}` and `/aizertech_messages/{messageId}` can be created by visitors, **only** with `status == 'new'`, exact allowed keys (`hasAll` + `hasOnly`), validated lengths, valid email format, and server timestamps (`createdAt == request.time`, `updatedAt == request.time`).
3. PII Isolation: client emails, phones, and messages are strictly private. Only verified studio administrators (`sablahevans0@gmail.com` or `sablaizer@gmail.com` with `email_verified == true`) may `get`, `list`, `update`, or `delete` contact messages.
4. Updates to `/contactMessages/{messageId}` and `/aizertech_messages/{messageId}` by an admin may only mutate `status` (within `['new', 'reviewed', 'replied', 'done', 'archived']`) and `updatedAt` (`== request.time`). Original message content remains immutable.
5. `/studioProjects/{projectId}` is strictly private to verified studio administrators (`get`, `list`, `create`, `update`, `delete`) with validated project fields, numeric `amountGhs >= 0`, `status in ['in_progress', 'done']`, and immutable `createdAt`.
6. `/admins/{adminId}` cannot be written from client SDKs; only verified admins can `get` admin records.
7. `/studioSettings/public` stores live public studio configuration (`heroHeadline`, `heroSubheadline`, `announcementBanner`, `websiteStartingPrice`, `mobileStartingPrice`, `brandingStartingPrice`, `whatsappNumber`, `contactEmail`, `founderBio`, `updatedAt`). Visitors may `get` only the exact `public` doc ID (`list` and `delete` are denied). Only verified admins (`email_verified == true`) may `create` or `update` `/studioSettings/public`, subject to strict key/length validation and `updatedAt == request.time`.

## 2. Adversarial Payloads ("Dirty Dozen+")
1. Unauthenticated `list` on `/contactMessages` or `/aizertech_messages` -> `PERMISSION_DENIED`
2. Authenticated non-admin `get` on `/contactMessages/{id}` or `/aizertech_messages/{id}` -> `PERMISSION_DENIED`
3. Unverified email claiming admin email (`email_verified: false`) reading `/aizertech_messages` -> `PERMISSION_DENIED`
4. Inquiry create with shadow field `isAdmin: true` -> `PERMISSION_DENIED`
5. Inquiry create with pre-set `status: 'replied'` or `'done'` instead of `'new'` -> `PERMISSION_DENIED`
6. Inquiry create with forged `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`
7. Inquiry create with 50KB `message` string -> `PERMISSION_DENIED`
8. Inquiry create with malformed email -> `PERMISSION_DENIED`
9. Inquiry create with invalid `messageId` containing spaces or >128 chars -> `PERMISSION_DENIED`
10. Admin update on message attempting to alter client email or message body -> `PERMISSION_DENIED`
11. Unauthenticated or non-admin attempting to read or write `/studioProjects/{id}` -> `PERMISSION_DENIED`
12. Admin creating `/studioProjects/{id}` with negative `amountGhs` or invalid status -> `PERMISSION_DENIED`
13. Non-admin attempting to write `/admins/{uid}` -> `PERMISSION_DENIED`
14. Unauthenticated or non-admin attempting to `create`, `update`, or `delete` `/studioSettings/public` -> `PERMISSION_DENIED`
15. Unauthenticated `list` on `/studioSettings` or `get` on `/studioSettings/private` -> `PERMISSION_DENIED`
16. Admin write to `/studioSettings/public` with invalid `contactEmail`, oversized `heroHeadline`, or extra unapproved field -> `PERMISSION_DENIED`
