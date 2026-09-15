// Basic fraud detection. Flags rapid bidding and high bid volume in a short
// window, records RiskFlag rows, and can suspend a bidder at CRITICAL level.

import { prisma } from "@/server/db/prisma";
import { RiskLevel } from "@prisma/client";

export interface RiskContext {
  userId: string;
  ip?: string | null;
  lotId: string;
}

const RAPID_BID_WINDOW_MS = 5_000; // 5 seconds
const RAPID_BID_THRESHOLD = 5; // 5+ bids in window => flag
const HIGH_VOLUME_WINDOW_MS = 60_000; // 60 seconds
const HIGH_VOLUME_THRESHOLD = 20; // 20+ bids in a minute => flag

/**
 * Evaluate a bid for basic fraud signals. Returns true if the bid should be
 * blocked (bidder suspended at CRITICAL level). Non-blocking flags are
 * recorded as RiskFlag rows.
 */
export async function evaluateBidRisk(ctx: RiskContext): Promise<{ blocked: boolean; flags: string[] }> {
  const flags: string[] = [];
  const now = new Date();

  // 1. Rapid bidding from the same user in a short window.
  const rapidCount = await prisma.bid.count({
    where: { bidderId: ctx.userId, createdAt: { gte: new Date(now.getTime() - RAPID_BID_WINDOW_MS) } },
  });
  if (rapidCount >= RAPID_BID_THRESHOLD) {
    flags.push("RAPID_BIDDING");
    await prisma.riskFlag.create({
      data: {
        userId: ctx.userId,
        kind: "RAPID_BIDDING",
        level: RiskLevel.MEDIUM,
        message: `${rapidCount} bids within ${RAPID_BID_WINDOW_MS / 1000}s`,
      },
    });
  }

  // 2. High bid volume in a short window.
  const volumeCount = await prisma.bid.count({
    where: { bidderId: ctx.userId, createdAt: { gte: new Date(now.getTime() - HIGH_VOLUME_WINDOW_MS) } },
  });
  if (volumeCount >= HIGH_VOLUME_THRESHOLD) {
    flags.push("HIGH_BID_VOLUME");
    await prisma.riskFlag.create({
      data: {
        userId: ctx.userId,
        kind: "HIGH_BID_VOLUME",
        level: RiskLevel.HIGH,
        message: `${volumeCount} bids within ${HIGH_VOLUME_WINDOW_MS / 60000}min`,
      },
    });
  }

  // 3. Block if the bidder is already suspended.
  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (user?.riskSuspended) {
    flags.push("SUSPENDED");
    return { blocked: true, flags };
  }

  return { blocked: false, flags };
}
