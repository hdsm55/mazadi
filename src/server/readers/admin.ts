import { prisma } from "@/server/db/prisma";

// Shared data readers for the Admin dashboard.

export async function getAdminUsers() {
  return prisma.user.findMany({
    include: { _count: { select: { bids: true, auctions: true, lots: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminPendingSellers() {
  return prisma.user.findMany({
    where: { sellerStatus: "PENDING_REVIEW" },
  });
}

export async function getAdminAuctions() {
  return prisma.auction.findMany({
    include: { seller: true, _count: { select: { lots: true, bids: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminLots() {
  return prisma.lot.findMany({
    include: { auction: true, seller: true, category: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { lots: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getAdminSettlements() {
  return prisma.settlement.findMany({
    include: { lot: { include: { seller: true } }, buyer: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminRiskFlags() {
  return prisma.riskFlag.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminAuditLogs() {
  return prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
