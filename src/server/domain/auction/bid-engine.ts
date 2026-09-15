import { Prisma, BidType, BidStatus, LotStatus, AuctionStatus, MaxBidStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { nextValidBidAmount } from "@/server/domain/money/money";
import { checkBidderEligibility } from "@/server/domain/trust/deposit";
import { evaluateBidRisk } from "@/server/domain/trust/risk";

export interface PlaceBidInput {
  lotId: string;
  bidderId: string;
  amountMinor: number;
  currency: string;
  type?: BidType;
  source?: string;
  idempotencyKey?: string;
}

export interface BidResult {
  bid: {
    id: string;
    sequence: number;
    amountMinor: number;
    type: BidType;
    status: BidStatus;
  };
  lot: {
    id: string;
    currentBidMinor: number;
    currentBidderId: string | null;
    bidCount: number;
    reserveMet: boolean;
    endAt: Date;
    status: LotStatus;
  };
  autoBids: Array<{ id: string; sequence: number; amountMinor: number; bidderId: string }>;
  extended: boolean;
}

export class BidError extends Error {
  constructor(
    message: string,
    public code:
      | "AUCTION_NOT_ACTIVE"
      | "LOT_NOT_ACTIVE"
      | "BIDDER_NOT_ALLOWED"
      | "BIDDER_IS_SELLER"
      | "AUCTION_CLOSED"
      | "INVALID_AMOUNT"
      | "INVALID_INCREMENT"
      | "CURRENCY_MISMATCH"
      | "DUPLICATE_BID"
      | "BIDDER_SUSPENDED"
      | "INSUFFICIENT_FUNDS",
  ) {
    super(message);
    this.name = "BidError";
  }
}

/**
 * Place a bid with full concurrency safety.
 *
 * - Runs in a transaction with `SELECT ... FOR UPDATE` on the lot row.
 * - Monotonic per-lot sequence (deterministic ordering, not timestamp-only).
 * - Idempotency via unique (lotId, idempotencyKey).
 * - Proxy/max-bid logic: if another bidder holds a higher MaxBid, the system
 *   auto-bids for them at the increment above the incoming bid, up to their max.
 */
export async function placeBid(input: PlaceBidInput): Promise<BidResult> {
  // Trust & Safety pre-checks (outside the locked transaction — they don't
  // need the lot row lock and would otherwise add round-trips that contend
  // with concurrent bids).
  const risk = await evaluateBidRisk({ userId: input.bidderId, lotId: input.lotId });
  if (risk.blocked) {
    throw new BidError("Bidder is suspended", "BIDDER_SUSPENDED");
  }
  const eligibility = await checkBidderEligibility(input.bidderId, input.amountMinor);
  if (!eligibility.allowed) {
    throw new BidError("Insufficient deposit or credit limit", "INSUFFICIENT_FUNDS");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Lock the lot row with FOR UPDATE (serializes concurrent bids on
    //    the same lot — Prisma's findUnique does NOT apply row locks).
    const lotRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Lot" WHERE id = ${input.lotId} FOR UPDATE
    `;
    if (lotRows.length === 0) throw new BidError("Lot not found", "LOT_NOT_ACTIVE");

    const lot = await tx.lot.findUnique({
      where: { id: input.lotId },
      include: { auction: true },
    });
    if (!lot) throw new BidError("Lot not found", "LOT_NOT_ACTIVE");

    // 2. Validate auction state.
    if (lot.auction.status !== AuctionStatus.LIVE && lot.auction.status !== AuctionStatus.EXTENDED) {
      throw new BidError("Auction is not live", "AUCTION_NOT_ACTIVE");
    }
    if (lot.status !== LotStatus.LIVE) {
      throw new BidError("Lot is not live", "LOT_NOT_ACTIVE");
    }
    const now = new Date();
    if (now >= lot.endAt) {
      throw new BidError("Auction has closed", "AUCTION_CLOSED");
    }
    if (now < lot.startAt) {
      throw new BidError("Auction has not started", "AUCTION_NOT_ACTIVE");
    }

    // 3. Validate bidder.
    if (input.bidderId === lot.sellerId) {
      throw new BidError("Seller cannot bid on own lot", "BIDDER_IS_SELLER");
    }
    if (input.currency !== lot.currency) {
      throw new BidError("Currency mismatch", "CURRENCY_MISMATCH");
    }

    // 4. Idempotency.
    if (input.idempotencyKey) {
      const existing = await tx.bid.findUnique({
        where: { lotId_idempotencyKey: { lotId: lot.id, idempotencyKey: input.idempotencyKey } },
      });
      if (existing) {
        throw new BidError("Duplicate bid", "DUPLICATE_BID");
      }
    }

    // 5. Validate amount against current price + increment.
    const currentMinor = lot.currentBidMinor;
    const minValid = nextValidBidAmount(currentMinor);
    if (input.amountMinor < minValid) {
      throw new BidError(
        `Bid must be at least ${minValid} (current ${currentMinor})`,
        "INVALID_INCREMENT",
      );
    }

    // 6. Compute next sequence.
    const lastBid = await tx.bid.findFirst({
      where: { lotId: lot.id },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    let nextSequence = (lastBid?.sequence ?? 0) + 1;

    // 7. Insert the incoming bid.
    const bid = await tx.bid.create({
      data: {
        lotId: lot.id,
        auctionId: lot.auctionId,
        bidderId: input.bidderId,
        amountMinor: input.amountMinor,
        currency: lot.currency,
        type: input.type ?? BidType.MANUAL,
        source: input.source ?? "web",
        status: BidStatus.WINNING,
        sequence: nextSequence,
        idempotencyKey: input.idempotencyKey,
      },
    });

    // 8. Proxy auto-bid: if another bidder holds a MaxBid above the incoming
    //    amount, auto-bid for them at the increment above, up to their max.
    const autoBids: Array<{ id: string; sequence: number; amountMinor: number; bidderId: string }> = [];
    let currentBidderId = input.bidderId;
    let currentAmount = input.amountMinor;
    let reserveMet = lot.reservePriceMinor !== null && input.amountMinor >= lot.reservePriceMinor;

    const competingMax = await tx.maxBid.findFirst({
      where: {
        lotId: lot.id,
        status: MaxBidStatus.ACTIVE,
        bidderId: { not: input.bidderId },
        maxAmountMinor: { gt: input.amountMinor },
      },
      orderBy: { maxAmountMinor: "desc" },
    });

    if (competingMax) {
      const autoAmount = Math.min(
        nextValidBidAmount(input.amountMinor),
        competingMax.maxAmountMinor,
      );
      nextSequence += 1;
      const autoBid = await tx.bid.create({
        data: {
          lotId: lot.id,
          auctionId: lot.auctionId,
          bidderId: competingMax.bidderId,
          amountMinor: autoAmount,
          currency: lot.currency,
          type: BidType.AUTO,
          source: "proxy",
          status: BidStatus.WINNING,
          sequence: nextSequence,
        },
      });
      autoBids.push({
        id: autoBid.id,
        sequence: autoBid.sequence,
        amountMinor: autoBid.amountMinor,
        bidderId: autoBid.bidderId,
      });
      currentBidderId = competingMax.bidderId;
      currentAmount = autoAmount;
      reserveMet = lot.reservePriceMinor !== null && autoAmount >= lot.reservePriceMinor;

      // The incoming manual bid is now outbid.
      await tx.bid.update({ where: { id: bid.id }, data: { status: BidStatus.OUTBID } });
    }

    // 9. Update the lot.
    const extended = await maybeExtendLot(
      tx,
      lot.endAt,
      lot.auction.antiSnipingEnabled,
      lot.auction.antiSnipingWindowSeconds,
    );
    const newEndAt = extended
      ? new Date(lot.endAt.getTime() + lot.auction.antiSnipingExtensionSeconds * 1000)
      : lot.endAt;

    const updatedLot = await tx.lot.update({
      where: { id: lot.id },
      data: {
        currentBidMinor: currentAmount,
        currentBidderId: currentBidderId,
        bidCount: { increment: autoBids.length + 1 },
        reserveMet,
        endAt: newEndAt,
        status: LotStatus.LIVE,
      },
    });

    // 10. Mark previous winning bid as OUTBID.
    await tx.bid.updateMany({
      where: { lotId: lot.id, status: BidStatus.WINNING, id: { notIn: [bid.id, ...autoBids.map((b) => b.id)] } },
      data: { status: BidStatus.OUTBID },
    });

    // 11. Record events.
    await tx.auctionEvent.create({
      data: {
        auctionId: lot.auctionId,
        lotId: lot.id,
        type: "BidPlaced",
        payload: { bidId: bid.id, amountMinor: input.amountMinor, bidderId: input.bidderId, sequence: bid.sequence },
      },
    });
    for (const ab of autoBids) {
      await tx.auctionEvent.create({
        data: {
          auctionId: lot.auctionId,
          lotId: lot.id,
          type: "AutoBidPlaced",
          payload: { bidId: ab.id, amountMinor: ab.amountMinor, bidderId: ab.bidderId, sequence: ab.sequence },
        },
      });
    }
    if (reserveMet && !lot.reserveMet) {
      await tx.auctionEvent.create({
        data: { auctionId: lot.auctionId, lotId: lot.id, type: "ReserveMet", payload: { amountMinor: currentAmount } },
      });
    }
    if (extended) {
      await tx.auctionEvent.create({
        data: { auctionId: lot.auctionId, lotId: lot.id, type: "AuctionExtended", payload: { newEndAt } },
      });
    }

    // 12. Outbox for reliable realtime propagation.
    await tx.outbox.create({
      data: {
        topic: "bid.updated",
        payload: {
          lotId: lot.id,
          auctionId: lot.auctionId,
          bidId: bid.id,
          amountMinor: currentAmount,
          bidderId: currentBidderId,
          sequence: nextSequence,
          bidCount: updatedLot.bidCount,
          reserveMet,
          endAt: newEndAt,
          extended,
          autoBids,
        },
      },
    });

    return {
      bid: { id: bid.id, sequence: bid.sequence, amountMinor: bid.amountMinor, type: bid.type, status: bid.status },
      lot: {
        id: updatedLot.id,
        currentBidMinor: updatedLot.currentBidMinor,
        currentBidderId: updatedLot.currentBidderId,
        bidCount: updatedLot.bidCount,
        reserveMet: updatedLot.reserveMet,
        endAt: updatedLot.endAt,
        status: updatedLot.status,
      },
      autoBids,
      extended,
    };
  });
}

async function maybeExtendLot(
  tx: Prisma.TransactionClient,
  endAt: Date,
  antiSnipingEnabled: boolean,
  windowSeconds: number,
): Promise<boolean> {
  if (!antiSnipingEnabled) return false;
  const now = new Date();
  const windowMs = windowSeconds * 1000;
  const remaining = endAt.getTime() - now.getTime();
  return remaining <= windowMs && remaining > 0;
}

/**
 * Set a proxy max bid for a bidder on a lot.
 * If the max bid exceeds the current price, immediately place a proxy bid.
 */
export async function setMaxBid(input: {
  lotId: string;
  bidderId: string;
  maxAmountMinor: number;
  currency: string;
}): Promise<BidResult> {
  // Upsert the max bid in its own transaction (no nesting with placeBid).
  const lot = await prisma.lot.findUnique({
    where: { id: input.lotId },
    include: { auction: true },
  });
  if (!lot) throw new BidError("Lot not found", "LOT_NOT_ACTIVE");
  if (input.currency !== lot.currency) throw new BidError("Currency mismatch", "CURRENCY_MISMATCH");
  if (input.bidderId === lot.sellerId) throw new BidError("Seller cannot bid on own lot", "BIDDER_IS_SELLER");

  await prisma.maxBid.upsert({
    where: { lotId_bidderId: { lotId: lot.id, bidderId: input.bidderId } },
    create: {
      lotId: lot.id,
      bidderId: input.bidderId,
      maxAmountMinor: input.maxAmountMinor,
      currency: input.currency,
      status: MaxBidStatus.ACTIVE,
    },
    update: { maxAmountMinor: input.maxAmountMinor, status: MaxBidStatus.ACTIVE },
  });

  // If max bid is above current price, place a proxy bid at the next
  // valid increment (not the full max — the max is held in reserve).
  if (input.maxAmountMinor > lot.currentBidMinor) {
    return placeBid({
      lotId: lot.id,
      bidderId: input.bidderId,
      amountMinor: nextValidBidAmount(lot.currentBidMinor),
      currency: input.currency,
      type: BidType.PROXY,
      source: "proxy",
    });
  }
  throw new BidError("Max bid must exceed current price", "INVALID_AMOUNT");
}
