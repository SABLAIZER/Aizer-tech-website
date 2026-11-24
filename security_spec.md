# Firestore Security Specification

## 1. Data Invariants
1. Every document under `/contactMessages/{messageId}`, `/aizertech_messages/{messageId}`, `/aizertech_invoices/{invoiceId}`, `/aizertech_bookings/{bookingId}`, and `/aizertech_testimonials/{testimonialId}` must have a valid alphanumeric/dash/underscore ID (`<= 128` chars).
2. Client inquiries (`/contactMessages` & `/aizertech_messages`) can be created by visitors only with `status == 'new'`, validated fields/lengths, and server timestamps (`createdAt == request.time`, `updatedAt == request.time`). Only verified studio admins may `get`, `list`, `update` (`status` pipeline stage, optional private `adminNote`, `updatedAt`), or `delete`.
3. `/aizertech_invoices/{invoiceId}` is strictly private to verified studio admins (`get`, `list`, `create`, `update`, `delete`) with validated GHS amount (`0..10,000,000`), invoice number, status (`'unpaid'` or `'paid'`), and immutable `createdAt`.
4. `/aizertech_bookings/{bookingId}` accepts public `create` strictly with `status == 'pending'`, validated date/time/service/phone fields, and server timestamps; PII reads (`get`, `list`), `update` (`status` & `updatedAt`), and `delete` are restricted exclusively to verified studio admins.
5. `/aizertech_testimonials/{testimonialId}` allows public `get`/`list` strictly when `approved == true` (admin can read all); `create`, `update`, `delete` are strictly admin-only with rating bounds (`1..5`) and text size limits.
6. Website Control CMS Safety: `/aizertech_draft/website` and `/aizertech_backup/{backupId}` are admin-only; `/aizertech_live/website` is public `get`-only and admin-writable.
7. `/studioSettings/public` is publicly `get`-readable and admin-writable with validated schema including MoMo details, auto-reply message, and working hours.

## 2. Adversarial Payloads ("Dirty Dozen+")
1. Unauthenticated `list` on `/contactMessages`, `/aizertech_messages`, `/aizertech_invoices`, or `/aizertech_bookings` -> `PERMISSION_DENIED`
2. Unauthenticated `list` on `/aizertech_testimonials` without filtering for `approved == true` (attempting to read hidden testimonials) -> `PERMISSION_DENIED`
3. Unauthenticated `create` on `/aizertech_bookings` with pre-confirmed `status: 'confirmed'` -> `PERMISSION_DENIED`
4. Unauthenticated `create` on `/aizertech_invoices` -> `PERMISSION_DENIED`
5. Unauthenticated `create` or `update` on `/aizertech_testimonials` -> `PERMISSION_DENIED`
6. Authenticated non-admin `get` on `/aizertech_invoices/{id}` or `/aizertech_draft/website` -> `PERMISSION_DENIED`
7. Unverified email claiming admin (`email_verified: false`) writing to `/aizertech_invoices` -> `PERMISSION_DENIED`
8. Inquiry or booking create with shadow field `isAdmin: true` -> `PERMISSION_DENIED`
9. Admin update attempting to mutate `createdAt` or `clientName` on `/aizertech_bookings/{id}` -> `PERMISSION_DENIED`
10. Admin write on `/aizertech_invoices/{id}` with negative `amountGhs: -500` -> `PERMISSION_DENIED`
11. Admin update attempting to alter `/aizertech_backup/{id}` (append-only backup integrity) -> `PERMISSION_DENIED`
12. Booking create with forged `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`
