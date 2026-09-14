# Testing — Mazadi

## Strategy

Layered testing proportional to risk, with the bid engine as the highest-risk area.

## Unit Tests

- Money: minor-unit conversion, increment ladder, next-valid-amount.
- Bid engine: proxy/max-bid, reserve, increments, anti-sniping, idempotency.

## Integration Tests (DB)

`tests/concurrency/bid-engine.test.ts` — real PostgreSQL:

- 20 simultaneous bids → one winner, unique sequences, no stale overwrite.
- Duplicate idempotency key rejected.
- Bid below increment rejected.
- Bid after close rejected.
- Seller cannot bid on own lot.
- Proxy max-bid auto-bids at increment above competing bid.
- Anti-sniping extends the auction.
- Auction close selects one winner, creates one settlement (idempotent).

## Stress Test

`tests/concurrency/stress-100.test.ts` — plan section 49:

- 100 bidders, same lot, random latency, manual + proxy mix.
- Assertions: one winner, highest valid wins, unique sequence, price correct,
  reserve correct, no stale overwrite, no post-close bid, single settlement.

## Running

```bash
npm test                 # all
npm run test:concurrency # concurrency + stress
```

## E2E (manual / future Playwright)

- Register → login → seller creates auction + lot → publish → buyer bids →
  outbid → max bid → anti-sniping → close → winner → payment.
