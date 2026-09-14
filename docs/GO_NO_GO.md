# GO / NO-GO — Phase 0 Decision

## Answers

1. **Mercur usable?** Yes as a commerce marketplace, but it has **no auction domain**.
2. **License safe for intended model?** Yes — MIT (Mercur) and MIT (Medusa). Safe for
   commercial, self-hosted, white-label use.
3. **Clean extension possible?** Technically possible (Medusa modules), but the entire auction
   engine must be built from scratch anyway, and it must be shoehorned into Medusa's
   cart/order/payment workflow conventions that the auction domain does not need.
4. **Core modification required?** Yes — adding Auction/Lot/Bid/MaxBid/sequence/anti-sniping
   as first-class domain primitives is a core-level addition, not a thin extension.
5. **Recommended base?** **Custom Modular Monolith** (Next.js + TypeScript + PostgreSQL +
   Redis + MinIO + Meilisearch + WebSocket + BullMQ).
6. **Main technical risks?**
   - Concurrency on the bid path (mitigated: row locks + unique constraints + idempotency).
   - Realtime propagation (mitigated: outbox pattern + Redis pub/sub + WebSocket).
   - Auction close idempotency (mitigated: locked, status-guarded close job).
7. **Estimated migration cost if abandoned later?** Low — the domain is isolated in
   `src/server/domain` with repository/service boundaries; a future move to a dedicated
   auction service is a mechanical extraction, not a rewrite.
8. **Final recommendation?** **GO — Custom Modular Monolith.**

## Rationale

- Neither Mercur nor Medusa ships any auction primitive; adopting either still requires
  building the full auction engine, while inheriting an opinionated commerce core we do not
  need.
- A custom Modular Monolith keeps the auction domain as the source of truth, avoids fragile
  external coupling, and preserves a clean upgrade path (extract auction engine later if load
  demands).
- PostgreSQL is the source of truth for bids; Redis is used only for pub/sub + queues, never
  as bid truth.

## Decision

```
STATUS: GO
Base: Custom (Modular Monolith)
```
