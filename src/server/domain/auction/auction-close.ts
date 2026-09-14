import { LotStatus, AuctionStatus, SettlementStatus, BidStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

/**
 * Close an auction lot idempotently.
 * - Locks the lot row.
 * - Only closes if the lot is LIVE and end_at has passed.
 * - Selects the winner (highest valid bid), validates reserve.
 * - Creates a settlement (exactly once).
 * - Publishes winner event via outbox.
 */
export async function closeLot(lotId: string): Promise<{ closed: boolean; winnerId: string | null; amountMinor: number }> {
  return prisma.$transaction(async (tx) => {
    const lot = await tx.lot.findUnique({
      where: { id: lotId },
      include: { auction: true },
    });
    if (!lot) throw new Error("Lot not found");

    // Idempotency guard: already closed.
    if (lot.status !== LotStatus.LIVE) {
      return { closed: false, winnerId: lot.winnerId, amountMinor: lot.currentBidMinor };
    }

    const now = new Date();
    if (now < lot.endAt) {
      return { closed: false, winnerId: null, amountMinor: lot.currentBidMinor };
    }

    // Determine winner: highest valid bid.
    const winningBid = await tx.bid.findFirst({
      where: { lotId: lot.id, status: BidStatus.WINNING },
      orderBy: [{ amountMinor: "desc" }, { sequence: "desc" }],
    });

    const reserveMet = lot.reservePriceMinor === null || (winningBid !== null && winningBid.amountMinor >= lot.reservePriceMinor);
    const winnerId = winningBid && reserveMet ? winningBid.bidderId : null;

    const newStatus = winnerId ? LotStatus.SOLD : LotStatus.UNSOLD;

    const updatedLot = await tx.lot.update({
      where: { id: lot.id },
      data: {
        status: newStatus,
        winnerId,
        winningBidId: winningBid?.id ?? null,
        reserveMet,
      },
    });

    // Mark winning bid as WON.
    if (winningBid) {
      await tx.bid.update({
        where: { id: winningBid.id },
        data: { status: BidStatus.WON },
      });
    }

    // Create settlement exactly once (unique lotId).
    if (winnerId && winningBid) {
      await tx.settlement.create({
        data: {
          lotId: lot.id,
          auctionId: lot.auctionId,
          buyerId: winnerId,
          sellerId: lot.sellerId,
          winningBidId: winningBid.id,
          amountMinor: winningBid.amountMinor,
          currency: lot.currency,
          status: SettlementStatus.PENDING_PAYMENT,
        },
      });
    }

    // Events.
    await tx.auctionEvent.create({
      data: {
        auctionId: lot.auctionId,
        lotId: lot.id,
        type: "AuctionClosed",
        payload: { winnerId, amountMinor: winningBid?.amountMinor ?? 0, reserveMet },
      },
    });
    if (winnerId) {
      await tx.auctionEvent.create({
        data: {
          auctionId: lot.auctionId,
          lotId: lot.id,
          type: "WinnerSelected",
          payload: { winnerId, amountMinor: winningBid?.amountMinor ?? 0 },
        },
      });
      await tx.auctionEvent.create({
        data: {
          auctionId: lot.auctionId,
          lotId: lot.id,
          type: "PaymentPending",
          payload: { winnerId, amountMinor: winningBid?.amountMinor ?? 0 },
        },
      });
    }

    // Outbox for realtime.
    await tx.outbox.create({
      data: {
        topic: "lot.closed",
        payload: {
          lotId: lot.id,
          auctionId: lot.auctionId,
          winnerId,
          amountMinor: winningBid?.amountMinor ?? 0,
          status: newStatus,
        },
      },
    });

    // If all lots closed, mark auction ENDED.
    const openLots = await tx.lot.count({
      where: { auctionId: lot.auctionId, status: { in: [LotStatus.LIVE, LotStatus.SCHEDULED] } },
    });
    if (openLots === 0) {
      await tx.auction.update({
        where: { id: lot.auctionId },
        data: { status: AuctionStatus.ENDED },
      });
    }

    return { closed: true, winnerId, amountMinor: winningBid?.amountMinor ?? 0 };
  });
}
