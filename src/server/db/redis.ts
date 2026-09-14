import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6384", {
    maxRetriesPerRequest: null,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export const PUBSUB_CHANNEL = "mazadi:events";
