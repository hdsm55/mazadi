import { prisma } from "@/server/db/prisma";
import { redis, PUBSUB_CHANNEL } from "@/server/db/redis";

/**
 * Outbox dispatcher — publishes PENDING outbox rows to Redis Pub/Sub.
 * Runs periodically (BullMQ worker or setInterval). Idempotent.
 */
export async function dispatchOutbox(batchSize = 100): Promise<number> {
  const pending = await prisma.outbox.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  for (const row of pending) {
    try {
      await redis.publish(PUBSUB_CHANNEL, JSON.stringify({ topic: row.topic, payload: row.payload }));
      await prisma.outbox.update({
        where: { id: row.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    } catch (e) {
      // Leave as PENDING for retry on next tick.
      console.error("Outbox dispatch failed", row.id, e);
    }
  }
  return pending.length;
}
