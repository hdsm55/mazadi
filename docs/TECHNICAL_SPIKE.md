# Technical Spike — Phase 0

## Objective

Verify whether an existing open-source marketplace core (Mercur / Medusa) can serve as the
foundation for the Mazadi auction platform, or whether a custom Modular Monolith is the
technically sounder path.

## Method

1. Cloned latest stable **Mercur** (`mercurjs/mercur`, HEAD `e6f157e`).
2. Cloned **Medusa** (`medusajs/medusa`, tag `v2.20.1`).
3. Inspected architecture, license, module layout, and auction support.
4. Built a minimal concurrency-safe bid spike to prove the auction domain is implementable
   cleanly on PostgreSQL.

## Findings

### Mercur

- **License**: MIT (Copyright 2025 Rigby). Safe for commercial/self-hosted use.
- **Stack**: Built on Medusa 2.20.1 (TypeScript, event-driven, API-first). Monorepo with
  `packages/core`, `packages/vendor`, `apps/api`, `apps/storefront`, `apps/vendor`.
- **Marketplace features**: vendor onboarding, multi-vendor catalogs, offers, commissions,
  automated payouts, admin + vendor dashboards.
- **Auction support**: **None.** No `auction`, `lot`, or `bid` module exists anywhere in the
  codebase. The auction engine would be built entirely from scratch on top of Medusa's core.

### Medusa

- **License**: MIT.
- **Stack**: Commerce core (catalog, orders, payments, shipping, tax, stock).
- **Auction support**: **None.** Same conclusion as Mercur.

### Implication

Both Mercur and Medusa are excellent *commerce* platforms, but neither has any auction
domain primitives. Adopting either means:

- Building the entire auction engine (Auction/Lot/Bid/MaxBid/sequence/anti-sniping) as a
  custom module anyway.
- Carrying a large, opinionated commerce core (orders, cart, shipping, tax, stock) that the
  auction domain does not need and that adds migration/upgrade weight.
- Fighting Medusa's module/workflow conventions for the concurrency-critical bid path.

The plan's own decision rule states: *"If both complicate the Auction Domain, build a custom
Modular Monolith."* That is the case here.

## Spike

A minimal spike (`tests/spike/`) proved the core auction primitives on PostgreSQL:

- `Auction`, `Lot`, `Bid` entities with `amount_minor` + `currency` (no float).
- Monotonic per-lot `Bid.sequence` (deterministic ordering, not timestamp-only).
- Row-level locking (`SELECT ... FOR UPDATE`) inside a transaction for bid placement.
- Idempotency via unique `(lot_id, idempotency_key)`.
- 20 simultaneous bids on one lot → exactly one winner, unique sequences, no stale overwrite.

## Conclusion

Custom Modular Monolith is the recommended base. See `GO_NO_GO.md`.
