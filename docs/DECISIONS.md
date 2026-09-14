# Decisions — Mazadi

## D1: Custom Modular Monolith over Mercur/Medusa

**Date**: Phase 0
**Context**: Both Mercur (MIT, Medusa-based) and Medusa have **no auction domain** primitives.
**Decision**: Build a custom Modular Monolith.
**Rationale**: Adopting either still requires building the full auction engine while inheriting
an opinionated commerce core we don't need. A custom monolith keeps the auction domain as the
source of truth with a clean upgrade path (extract auction engine later).
**See**: `docs/GO_NO_GO.md`.

## D2: PostgreSQL as source of truth for bids

**Context**: Redis is tempting for speed but is not durable.
**Decision**: PostgreSQL is the source of truth. Redis is used only for pub/sub + queues.
**Rationale**: Durability, transactional consistency, row-level locking, unique constraints.

## D3: Row-level locking + monotonic sequence for concurrency

**Context**: Concurrent bids on the same lot must not race.
**Decision**: `SELECT ... FOR UPDATE` on the lot row inside a transaction, plus a monotonic
per-lot `Bid.sequence` (not timestamp-only).
**Rationale**: Deterministic ordering and winner selection under concurrency.

## D4: Outbox pattern for realtime events

**Context**: A committed bid must not lose its realtime event.
**Decision**: Write `domain_event_outbox` in the same transaction as the state change; a worker
publishes to Redis Pub/Sub → WebSocket.
**Rationale**: No lost events, no double-publish (idempotent status transition).

## D5: Money as integer minor units

**Context**: Float money causes rounding drift.
**Decision**: Every money value is `amount_minor` (integer) + `currency`. No floats.
**Rationale**: Exactness for financial transactions.

## D6: Idempotent auction close

**Context**: A close job may run twice (worker restart, duplicate job).
**Decision**: Close is guarded by lot status + row lock; settlement has a unique `lotId`.
**Rationale**: Exactly one settlement per lot.

## D7: Configurable bid increments

**Context**: A single hardcoded increment is wrong.
**Decision**: Increment ladder is configurable per auction/tenant (default ladder in
`src/server/domain/money/money.ts`).
**Rationale**: Flexibility across categories and markets.
