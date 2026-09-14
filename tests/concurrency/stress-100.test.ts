import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db/prisma";
import { placeBid, setMaxBid } from "@/server/domain/auction/bid-engine";
import { closeLot } from "@/server/domain/auction/auction-close";
import { AuctionStatus, LotStatus, BidStatus } from "@prisma/client";

// Plan section 49: 100 bidders, same lot, same 1-3s window, random latency,
// manual + proxy bids. Assertions: one winner, highest valid wins, no stale
// overwrite, unique sequence, price correct, reserve correct, no post-close bid.

async function createStressLot() {
  const seller = await prisma.user.create({
    data: { email: `stress-seller-${Date.now()}@test.com`, passwordHash: "x", name: "Stress Seller" },
  });
  const auction = await prisma.auction.create({
    data: {
      sellerId: seller.id,
      title: "Stress Auction",
      status: AuctionStatus.LIVE,
      startAt: new Date(Date.now() - 1000),
      endAt: new Date(Date.now() + 30000),
      antiSnipingEnabled: false,
    },
  });
  const lot = await prisma.lot.create({
    data: {
      auctionId: auction.id,
      sellerId: seller.id,
      title: "Stress Lot",
      startingPriceMinor: 1000,
      reservePriceMinor: 50000,
      currency: "USD",
      startAt: new Date(Date.now() - 1000),
      endAt: new Date(Date.now() + 30000),
      status: LotStatus.LIVE,
    },
  });
  return { seller, auction, lot };
}

async function createBidder() {
  return prisma.user.create({
    data: { email: `stress-bidder-${Date.now()}-${Math.random()}@test.com`, passwordHash: "x", name: "Bidder" },
  });
}

describe("Concurrency Stress Test — 100 bidders", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("100 bidders on the same lot → one winner, highest valid wins, unique sequences", async () => {
    const { lot } = await createStressLot();
    const bidders = await Promise.all(Array.from({ length: 100 }, () => createBidder()));

    // Random latency + random amounts (manual + proxy mix).
    const results = await Promise.allSettled(
      bidders.map((b, i) => {
        const delay = Math.floor(Math.random() * 2000);
        const amountMinor = 1000 + (i + 1) * 1000; // 2000, 3000, ... 101000
        return new Promise<Awaited<ReturnType<typeof placeBid>>>((resolve, reject) => {
          setTimeout(() => {
            // Mix: even indices place manual bids, odd indices set max bids.
            if (i % 2 === 0) {
              placeBid({ lotId: lot.id, bidderId: b.id, amountMinor, currency: "USD" }).then(resolve).catch(reject);
            } else {
              setMaxBid({ lotId: lot.id, bidderId: b.id, maxAmountMinor: amountMinor, currency: "USD" })
                .then(resolve)
                .catch(reject);
            }
          }, delay);
        });
      }),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThan(0);

    // All accepted bids recorded with unique monotonic sequences.
    // Note: proxy max-bids may create additional AUTO bid records, so
    // bids.length >= fulfilled.length.
    const bids = await prisma.bid.findMany({ where: { lotId: lot.id }, orderBy: { sequence: "asc" } });
    expect(bids.length).toBeGreaterThanOrEqual(fulfilled.length);
    const sequences = bids.map((b) => b.sequence);
    expect(new Set(sequences).size).toBe(bids.length);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));

    // Exactly one WINNING bid.
    const winning = bids.filter((b) => b.status === BidStatus.WINNING);
    expect(winning.length).toBe(1);

    // Highest accepted bid wins.
    const highest = bids.reduce((a, b) => (b.amountMinor > a.amountMinor ? b : a));
    expect(winning[0].id).toBe(highest.id);

    // Lot reflects winner (no stale overwrite).
    const updatedLot = await prisma.lot.findUnique({ where: { id: lot.id } });
    expect(updatedLot!.currentBidderId).toBe(highest.bidderId);
    expect(updatedLot!.currentBidMinor).toBe(highest.amountMinor);
    expect(updatedLot!.bidCount).toBe(bids.length);

    // Reserve correctness: highest bid >= reserve → reserveMet true.
    expect(updatedLot!.reserveMet).toBe(highest.amountMinor >= 50000);

    // Close the lot and verify exactly one winner + one settlement.
    await prisma.lot.update({ where: { id: lot.id }, data: { endAt: new Date(Date.now() - 1000) } });
    const closeResult = await closeLot(lot.id);
    expect(closeResult.closed).toBe(true);
    expect(closeResult.winnerId).toBe(highest.bidderId);

    const settlements = await prisma.settlement.findMany({ where: { lotId: lot.id } });
    expect(settlements.length).toBe(1);

    // No post-close bid accepted.
    const lateBidder = await createBidder();
    await expect(
      placeBid({ lotId: lot.id, bidderId: lateBidder.id, amountMinor: 200000, currency: "USD" }),
    ).rejects.toThrow();
  }, 60000);
});
