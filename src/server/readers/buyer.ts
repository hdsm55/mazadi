import { prisma } from "@/server/db/prisma";
import { BidStatus } from "@prisma/client";

// Shared data readers for the Buyer dashboard. Keeps page components thin and
// avoids duplicating query logic across sections.

export async function getBuyerBids(userId: string) {
  return prisma.bid.findMany({
    where: { bidderId: userId },
    include: { lot: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBuyerBidsByStatus(userId: string, status: BidStatus) {
  return prisma.bid.findMany({
    where: { bidderId: userId, status },
    include: { lot: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBuyerWatchlist(userId: string) {
  return prisma.watchlist.findMany({
    where: { userId },
    include: { lot: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBuyerSettlements(userId: string) {
  return prisma.settlement.findMany({
    where: { buyerId: userId },
    include: { lot: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBuyerNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getBuyerDeposits(userId: string) {
  return prisma.bidderDeposit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
