# Security Specification — Jameel Khan | Legal Research & Publications

## 1. Data Invariants
1. **Single-Authority Publishing**: Only an explicitly authorized administrator (`isAdmin()` verified via `/admins/{uid}` or verified bootstrapped admin email) can create, edit, publish, unpublish, or delete content across `articles`, `research_papers`, `case_laws`, `judgments`, `presentations`, `lectures`, `resources`, `categories`, `tags`, `profiles`, and `site_settings`.
2. **Zero Draft Leakage**: Public visitors may ONLY `get` or `list` documents in content collections when `resource.data.status == 'published'`. Drafts, scheduled items, unpublished items, and soft-deleted items are strictly readable only by `isAdmin()`.
3. **PII Isolation**: `subscribers` (visitor emails) and `contact_messages` (sender names, emails, messages) are strictly write-only for public visitors (`create` only with strict length & schema limits) and readable/modifiable/deletable strictly by `isAdmin()`.
4. **No Self-Privilege Escalation**: Unauthenticated or non-admin users can never write to `/admins/{uid}`, `/activity_logs/{id}`, or `/revisions/{id}`.
5. **Path & Payload Hardening**: Every single-document operation enforces `isValidId(docId)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars), strict string `.size()` bounds, bounded list sizes, and server-side `request.time` temporal integrity on `createdAt`/`updatedAt` for admin writes.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Draft Read**: Anonymous `GET /articles/draft-article-1` (`status == 'draft'`) -> `PERMISSION_DENIED`.
2. **List Query Bypass**: Anonymous `LIST /articles` without `where('status', '==', 'published')` -> `PERMISSION_DENIED`.
3. **Admin Escalation**: Authenticated non-admin `CREATE /admins/{uid}` with `role: 'super_admin'` -> `PERMISSION_DENIED`.
4. **Unverified Email Spoofing**: Token with `email: 'ayeshakhania123@gmail.com'` and `email_verified: false` attempting admin write -> `PERMISSION_DENIED`.
5. **Shadow Ghost Field**: Admin or visitor payload injecting `isVerified: true` or `shadowAdmin: true` into `articles` or `contact_messages` -> `PERMISSION_DENIED` (`hasOnly` rejection).
6. **ID Poisoning**: Creating document with 500-char ID or `/../` path traversal characters -> `PERMISSION_DENIED` (`isValidId`).
7. **PII Scrape on Subscribers**: Non-admin `GET` or `LIST` on `/subscribers` -> `PERMISSION_DENIED`.
8. **PII Scrape on Contact Messages**: Non-admin `GET` or `LIST` on `/contact_messages` -> `PERMISSION_DENIED`.
9. **Resource Exhaustion (1MB String)**: Submitting a 500KB `message` in `/contact_messages` -> `PERMISSION_DENIED` (`size() <= 5000`).
10. **Immutable CreatedAt Tampering**: Updating an article with a modified `createdAt` timestamp -> `PERMISSION_DENIED`.
11. **Backdated Timestamp Spoofing**: Creating a publication with a client-forged `createdAt` != `request.time` -> `PERMISSION_DENIED`.
12. **Private Media Exposure**: Anonymous `GET` or `LIST` on `/media` where `visibility == 'private'` -> `PERMISSION_DENIED`.
