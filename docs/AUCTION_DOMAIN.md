# Auction Domain — Mazadi

## Entities

- **Auction**: tenant, seller, title, type, status, start_at, end_at, timezone, currency,
  anti-sniping config, visibility, approval_status.
- **Lot**: auction_id, seller_id, title, category, condition, starting/reserve/buy-now prices
  (minor), current_bid_minor, current_bidder_id, bid_count, position, start/end, status,
  reserve_met, winner_id, winning_bid_id.
- **Bid**: lot_id, auction_id, bidder_id, amount_minor, currency, type (MANUAL/AUTO/PROXY/
  ADMIN/FLOOR/PHONE), source, status, **sequence** (monotonic per lot), idempotency_key.
- **MaxBid**: lot_id, bidder_id, max_amount_minor, currency, status.

## Money Rules

- No float. `$8,750.25` → `875025` minor units.
- Every money value carries `amount_minor` + `currency`.
- One currency per auction/lot in V1.

## Bid Engine

Bid placement is a transaction:

```text
BEGIN
  SELECT lot FOR UPDATE
  validate: auction active, lot active, bidder allowed, bidder != seller,
            time valid, amount valid, increment valid, currency valid, idempotent
  calculate: manual / proxy / max-bid, current winner, next valid amount
  insert bid event(s)
  update lot: current price, current bidder, bid count, reserve_met
  if anti-sniping: extend end_at
COMMIT
publish domain event (outbox)
```

### Proxy / Max Bid

Example: current price $21,600. Bidder A sets max $23,500. Bidder B bids $22,000.
System auto-bids $22,250 for A (increment above B). If B bids $24,000, B leads per increment
policy. Edge cases covered by tests.

### Bid Increments

Configurable per auction/tenant, not hardcoded. Default ladder:

```text
0–100      → +5
100–500    → +10
500–1000   → +25
1000–5000  → +50
5000+      → +100
```

### Reserve

`reserve_price_minor` + `reserve_met`. Buyers see only "Reserve not met" / "Reserve met",
never the real reserve.

### Anti-Sniping

A bid within the last `anti_sniping_window_seconds` (default 120) extends `end_at` by
`anti_sniping_extension_seconds` (default 120). Repeats while bids continue.

## Bid Sequence

Each lot has a monotonic `Bid.sequence` (1, 2, 3, …). Ordering is deterministic even under
concurrency; timestamps are never the sole ordering key.

## Auction Close

Idempotent job:

```text
lock lot → check status → check end_at → determine final bid → validate reserve
→ select winner → update lot → create settlement → publish event → commit
```

Running twice never creates two settlements.

## Event Ledger

Immutable audit trail: AuctionCreated, AuctionPublished, LotAdded, BidPlaced, BidRejected,
AutoBidPlaced, ReserveMet, AuctionExtended, AuctionClosed, WinnerSelected, PaymentPending,
PaymentCompleted, SettlementCompleted, DisputeOpened. No deletion of history.

## Statuses

- **Auction**: DRAFT, PENDING_APPROVAL, SCHEDULED, LIVE, EXTENDED, ENDED, SETTLING, SETTLED,
  CANCELLED.
- **Lot**: DRAFT, SCHEDULED, LIVE, SOLD, UNSOLD, PASSED, CANCELLED.
- **Payment**: PENDING, AUTHORIZED, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED, DISPUTED,
  CANCELLED.
