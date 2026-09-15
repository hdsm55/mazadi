import { prisma } from "@/server/db/prisma";

// Shared data readers for the Seller dashboard.

export async function getSellerAuctions(sellerId: string) {
  return prisma.auction.findMany({
    where: { sellerId },
    include: { lots: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSellerLots(sellerId: string) {
  return prisma.lot.findMany({
    where: { sellerId },
    include: { auction: true, category: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSellerSettlements(sellerId: string) {
  return prisma.settlement.findMany({
    where: { sellerId },
    include: { lot: true, buyer: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSellerCustomers(sellerId: string) {
  // Buyers who have won lots from this seller.
  const settlements = await prisma.settlement.findMany({
    where: { sellerId },
    include: { buyer: true },
    distinct: ["buyerId"],
  });
  return settlements.map((s) => s.buyer);
}
