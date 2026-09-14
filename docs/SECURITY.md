# Security — Mazadi

## Authentication & Sessions

- Passwords hashed with **bcrypt** (cost 12).
- Session tokens are random UUIDs stored in the DB with expiry; cookies are `httpOnly`,
  `sameSite=lax`, `secure` in production.
- RBAC roles: `BUYER`, `SELLER`, `ADMIN`. Server actions enforce role via `requireRole`.

## Authorization

- Server actions call `requireUser` / `requireRole` before any mutation.
- Sellers can only manage their own auctions/lots (ownership checks).
- Sellers cannot bid on their own lots.

## Input Validation

- All server actions validate input with **Zod** schemas.
- Money is integer minor units only — no floats, no rounding drift.

## Concurrency & Integrity

- PostgreSQL is the source of truth for bids.
- Row-level locking (`SELECT ... FOR UPDATE`) serializes concurrent bids on a lot.
- Monotonic per-lot `Bid.sequence` gives deterministic ordering.
- Unique `(lotId, idempotencyKey)` prevents duplicate bids.
- Auction close is idempotent (single settlement).

## Secrets

- No secrets in code or git. `.env` is gitignored.
- `AUTH_SECRET` must be a strong random value in production.

## Rate Limiting & Abuse

- Idempotency keys prevent duplicate submissions.
- (Production) add rate limiting at the reverse proxy for bid endpoints.

## Dependency Audit

- `npm audit` is clean of high/critical vulnerabilities in runtime dependencies.
- Remaining moderate advisories are dev-only (Vitest UI server, not used in production).

## Uploads

- `uploads/` is gitignored and must be backed up before deploys.
- (Production) enforce MIME + file-size validation on uploads.

## CSRF

- Server actions use Next.js's built-in CSRF protections (same-origin + action IDs).
- Cookies are `sameSite=lax`.
