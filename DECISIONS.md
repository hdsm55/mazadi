# DECISIONS — Luxury Seed + Search Integration

## 1. Seed data (prisma/seed.ts)
- **45 lots** across 5 auctions (Watches, Cars, Art, Collectibles, Electronics), 5 approved sellers, 10 buyers, 1 admin.
- Statuses: 21 LIVE, 16 SCHEDULED, 5 SOLD, 3 UNSOLD.
- **Hero:** Rolex Daytona 116500LN — current bid $21,600 (2160000 minor), 27 bids, ~2:14 remaining, reserve met. Title contains "Rolex" so the homepage `heroLot` lookup matches.
- Money is integer minor units only (via `toMinor`). No floats.
- **Idempotent:** full delete-then-recreate of demo tables; running `db:seed` twice yields identical counts.
- Bid histories are real `Bid` rows with monotonic sequences; the last is WINNING, prior are OUTBID; lot current bid/bid count/reserve state derived from them. `AuctionEvent` rows recorded (BidPlaced, ReserveMet, AuctionClosed).
- SOLD lots get a winner + `Settlement` (PAID) + AuctionClosed event.

## 2. Search integration (src/server/search/index.ts)
- Meilisearch on `:7703` (container `mazadi-meilisearch`). Index `lots`, primary key `id`.
- **Primary key must be explicit** — Meilisearch's inference fails on multiple `*Id` fields (`categoryId`, `sellerId`, `id`). `ensureSearchIndex()` drops/recreates the index if its primary key isn't `id`.
- Documents are denormalized lot snapshots (title, category, seller, status, condition, prices, bidCount, reserveMet, timestamps) so filtering/sorting happens in Meilisearch.
- Filterable: categoryId, status, currency, reserveMet, condition, sellerId, endAt, currentBidMinor, bidCount, startAt. Sortable: endAt, currentBidMinor, bidCount, startAt.
- Worker reindexes all lots every 30s (cheap at this scale) + ensures settings once — keeps index in sync with seed and runtime changes without a separate indexing pipeline.

## 3. Search page (src/app/search/page.tsx)
- Queries Meilisearch with filters: keyword, category, status, condition, min/max price, reserve status; sort: ending-soon, newest, most-bids, highest-price, lowest-price, trending.
- **Prisma fallback:** if Meilisearch is unreachable or returns nothing, the page falls back to a direct Prisma query so it never renders dead.
- Returns lot ids from Meilisearch, hydrates full records from Prisma, preserves Meilisearch ordering.
