# Architecture — Mazadi

## Style

**Modular Monolith.** One deployable application with clearly separated domain modules.
No microservices, no Kubernetes. The auction engine can be extracted into a dedicated
service later if load demands (clean upgrade path).

## Stack

| Layer | Technology |
|-------|-----------|
| Web/API | Next.js 16 (App Router) + TypeScript (strict) |
| UI | Tailwind CSS + shadcn/ui + React Query + Zod |
| DB | PostgreSQL (source of truth) |
| ORM | Prisma |
| Realtime | WebSocket + Redis Pub/Sub |
| Queue | BullMQ (Redis) |
| Search | Meilisearch |
| Storage | MinIO (S3-compatible) |
| Money | `amount_minor` + `currency` (integer minor units, no float) |

## High-Level Flow

```text
Next.js Web (RSC + client components)
   │
   ├── Server Actions / Route Handlers  →  Domain Services  →  PostgreSQL
   │
   └── WebSocket (bid.updated, auction.extended, lot.closed, winner.selected)
            ▲
            │ Redis Pub/Sub
            │
   Domain Event → Outbox (DB) → Dispatcher → Redis → WS
```

## Module Boundaries

- `src/server/domain/auction` — Auction, Lot, Bid, MaxBid, sequence, anti-sniping, close.
- `src/server/domain/money` — minor-unit money, increments, fee rules.
- `src/server/domain/user` — users, roles (RBAC), seller approval.
- `src/server/domain/payment` — mock payments, settlement, payouts.
- `src/server/domain/notification` — in-app + email notifications.
- `src/server/domain/search` — Meilisearch indexing.

Domain logic is isolated from React components. Services depend on repositories; repositories
own SQL/Prisma access.

## Concurrency Model

- PostgreSQL is the **source of truth** for bids.
- Bid placement runs in a transaction with `SELECT ... FOR UPDATE` on the lot row.
- Monotonic per-lot `Bid.sequence` gives deterministic ordering (not timestamp-only).
- Unique constraint `(lot_id, idempotency_key)` prevents duplicate bids.
- Auction close is idempotent: locked, status-guarded, single settlement.

## Realtime & Reliability

- Critical events (bid, winner) are written to a `domain_event_outbox` in the same
  transaction as the state change (outbox pattern) → no lost events.
- A dispatcher publishes outbox rows to Redis Pub/Sub → WebSocket fan-out.
- Redis is never the source of truth for bids.

## Multi-Tenancy

`tenant_id` is modeled from the start (each professional auction house is a tenant) but kept
simple in V1. Data access enforces tenant scope.

## Money

Every money value is stored as `amount_minor` (integer) + `currency`. No floats anywhere.
Formatting via `Intl.NumberFormat`.
