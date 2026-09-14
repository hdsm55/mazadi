# Mazadi — Global Auction Platform

A trusted auction operating system, marketplace, and transaction network.

## Stack

- **Next.js 16** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + **shadcn/ui**
- **PostgreSQL** (source of truth) via **Prisma**
- **Redis** (pub/sub + BullMQ queues — never bid truth)
- **MinIO** (S3-compatible storage)
- **Meilisearch** (search)
- **WebSocket** (realtime bid propagation)
- **BullMQ** (auction close, outbox dispatch)

## Architecture

**Modular Monolith.** Domain logic is isolated in `src/server/domain/` with repository/service
boundaries. See `docs/ARCHITECTURE.md` and `docs/AUCTION_DOMAIN.md`.

## Quick Start

```bash
# 1. Start infrastructure (PostgreSQL, Redis, MinIO, Meilisearch)
docker compose up -d

# 2. Install deps
npm install

# 3. Configure env
cp .env.example .env

# 4. Migrate + seed
npx prisma migrate deploy
npx tsx prisma/seed.ts

# 5. Run the app (3 terminals)
npx next dev -p 3100          # web
npx tsx src/server/realtime/ws-server.ts   # websocket
npx tsx src/server/worker/index.ts          # bullmq worker
```

## Demo Accounts (password: `password123`)

| Role | Email |
|------|-------|
| Admin | `admin@mazadi.com` |
| Seller | `seller1@mazadi.com` … `seller5@mazadi.com` |
| Buyer | `bidder1@mazadi.com` … `bidder10@mazadi.com` |

## Hero Demo

The seed creates a **Rolex Daytona** lot (current bid $21,600, ~2:14 remaining) with the full
proxy-bid scenario: Bidder A holds max $23,500, Bidder B bids $22,000, system auto-bids for A.

## Tests

```bash
npm test                 # all tests
npm run test:concurrency # 20-bid + 100-bidder stress tests
```

## Docs

- `docs/ARCHITECTURE.md` — system architecture
- `docs/AUCTION_DOMAIN.md` — auction domain rules
- `docs/TECHNICAL_SPIKE.md` — Phase 0 spike
- `docs/GO_NO_GO.md` — base decision
- `docs/RUNBOOK.md` — operations
- `docs/DEPLOYMENT.md` — deployment
- `docs/SECURITY.md` — security model
- `docs/TESTING.md` — testing strategy
- `docs/DECISIONS.md` — architecture decisions
