import { Worker, Queue } from "bullmq";
import { redis } from "@/server/db/redis";
import { prisma } from "@/server/db/prisma";
import { closeLot } from "@/server/domain/auction/auction-close";
import { dispatchOutbox } from "@/server/realtime/outbox";
import { notifyWinner, notifySold, notifyPaymentRequired } from "@/server/domain/notification/notification";

const connection = { host: "localhost", port: 6384 };

export const closeQueue = new Queue("auction-close", { connection });

// Worker: close lots whose end_at has passed.
const closeWorker = new Worker(
  "auction-close",
  async (job) => {
    const { lotId } = job.data as { lotId: string };
    const result = await closeLot(lotId);
    if (result.closed && result.winnerId) {
      const lot = await prisma.lot.findUnique({ where: { id: lotId } });
      if (lot) {
        await notifyWinner(result.winnerId, lot.title, result.amountMinor);
        await notifyPaymentRequired(result.winnerId, lot.title, result.amountMinor);
        await notifySold(lot.sellerId, lot.title, result.amountMinor);
      }
    }
    return result;
  },
  { connection },
);

// Worker: dispatch outbox events to Redis pub/sub.
const outboxWorker = new Worker(
  "outbox-dispatch",
  async () => {
    return dispatchOutbox();
  },
  { connection },
);

// Periodic sweep: enqueue close jobs for expired lots.
async function sweepExpiredLots() {
  const now = new Date();
  const expired = await prisma.lot.findMany({
    where: { status: "LIVE", endAt: { lte: now } },
    select: { id: true },
  });
  for (const lot of expired) {
    await closeQueue.add("close-lot", { lotId: lot.id }, { jobId: `close-${lot.id}`, removeOnComplete: true });
  }
}

setInterval(sweepExpiredLots, 5000);
setInterval(() => dispatchOutbox(), 1000);

console.log("[mazadi-worker] started");

// Keep process alive.
process.on("SIGTERM", async () => {
  await closeWorker.close();
  await outboxWorker.close();
  process.exit(0);
});
