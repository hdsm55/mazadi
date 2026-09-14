# Deployment — Mazadi

## Architecture

Single deployable Next.js app (Modular Monolith) + WebSocket server + BullMQ worker,
backed by PostgreSQL, Redis, MinIO, and Meilisearch.

## Production Build

```bash
npm ci
npx prisma migrate deploy
npm run build
```

## Processes

Run three processes behind a reverse proxy (Caddy/Nginx):

1. **Web**: `npm run start` (Next.js production server)
2. **WebSocket**: `npx tsx src/server/realtime/ws-server.ts`
3. **Worker**: `npx tsx src/server/worker/index.ts`

## Environment

All secrets via environment variables (see `.env.example`). Never commit `.env`.

- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` — Redis connection
- `MINIO_*` — object storage credentials
- `MEILISEARCH_*` — search credentials
- `AUTH_SECRET` — session signing secret (must be strong in production)

## Reverse Proxy (Caddy)

```caddyfile
mazadi.example.com {
    reverse_proxy localhost:3100
}
ws.mazadi.example.com {
    reverse_proxy localhost:3001
}
```

## Backups

- PostgreSQL: `pg_dump` scheduled via cron.
- MinIO: mirror the bucket.
- `uploads/` is not tracked in git — back it up before any deploy.

## Staging

Use the same Docker Compose stack with a separate database and environment.
Run `npx tsx prisma/seed.ts` to load demo data.
