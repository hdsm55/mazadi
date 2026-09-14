# Runbook — Mazadi

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Next.js web | 3100 | App + API |
| WebSocket | 3001 | Realtime bid fan-out |
| BullMQ worker | — | Auction close + outbox dispatch |
| PostgreSQL | 5438 | Source of truth |
| Redis | 6384 | Pub/sub + queues |
| MinIO | 9003/9006 | Object storage |
| Meilisearch | 7703 | Search |

## Start / Stop

```bash
# Infrastructure
docker compose up -d
docker compose down

# App (3 processes)
npx next dev -p 3100
npx tsx src/server/realtime/ws-server.ts
npx tsx src/server/worker/index.ts
```

## Database

```bash
npx prisma migrate deploy   # apply migrations
npx prisma migrate dev      # create + apply (dev)
npx prisma studio           # browse data
npx tsx prisma/seed.ts      # reseed demo data
```

## Health Checks

```bash
curl -s http://localhost:3100/ | grep -q "Mazadi" && echo "web OK"
curl -s http://localhost:7703/health && echo "meili OK"
docker compose ps           # all services healthy
```

## Common Tasks

- **Reseed demo**: `npx tsx prisma/seed.ts`
- **Run tests**: `npm test`
- **Typecheck**: `npm run typecheck`
- **Build**: `npm run build`

## Troubleshooting

- **Port busy**: check `docker compose ps`; adjust ports in `docker-compose.yml`.
- **Bid rejected "Auction has closed"**: the lot's `end_at` passed; the worker closes it.
- **No realtime updates**: ensure `ws-server.ts` and `worker/index.ts` are running.
