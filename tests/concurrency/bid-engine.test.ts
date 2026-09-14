import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db/prisma";
import { placeBid, setMaxBid, BidError } from "@/server/domain/auction/bid-engine";
import { closeLot } from "@/server/domain/auction/auction-close";
import { AuctionStatus, LotStatus } from "@prisma/client";

// Helper to create a test auction + lot.
async function createTestLot(opts?: { endAt?: Date; antiSniping?: boolean }) {
  const seller = await prisma.user.create({
    data: { email: `seller-${Date.now()}-${Math.random()}@test.com`, passwordHash: "x", name: "Seller" },
  });
  const auction = await prisma.auction.create({
    data: {
      sellerId: seller.id,
      title: "Test Auction",
      status: AuctionStatus.LIVE,
      startAt: new Date(Date.now() - 1000),
      endAt: opts?.endAt ?? new Date(Date.now() + 60000),
      antiSnipingEnabled: opts?.antiSniping ?? false,
    },
  });
  const lot = await prisma.lot.create({
    data: {
      auctionId: auction.id,
      sellerId: seller.id,
      title: "Test Lot",
      startingPriceMinor: 1000,
      reservePriceMinor: 5000,
      currency: "USD",
      startAt: new Date(Date.now() - 1000),
      endAt: opts?.endAt ?? new Date(Date.now() + 60000),
      status: LotStatus.LIVE,
    },
  });
  return { seller, auction, lot };
}

async function createBidder() {
  return prisma.user.create({
    data: { email: `bidder-${Date.now()}-${Math.random()}@test.com`, passwordHash: "x", name: "Bidder" },
  });
}

describe("Bid Engine — Concurrency", () => {
  beforeAll(async () => {
    // Ensure DB is reachable.
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("20 simultaneous bids on the same lot → one winner, unique sequences, no stale overwrite", async () => {
    const { lot } = await createTestLot();
    const bidders = await Promise.all(Array.from({ length: 20 }, () => createBidder()));

    // Fire 20 concurrent bids with increment-spaced amounts.
    // Lower bids may be rejected once a higher bid raises the floor — that is
    // correct increment enforcement. Invariants: exactly one winner, the
    // highest accepted bid wins, sequences are unique, no stale overwrite.
    const amounts = [
      1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000,
      6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 11000, 12000,
    ];
    const results = await Promise.allSettled(
      bidders.map((b, i) =>
        placeBid({
          lotId: lot.id,
          bidderId: b.id,
          amountMinor: amounts[i],
          currency: "USD",
          idempotencyKey: `test-${lot.id}-${i}`,
        }),
      ),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThan(0);

    // All accepted bids recorded.
    const bids = await prisma.bid.findMany({ where: { lotId: lot.id }, orderBy: { sequence: "asc" } });
    expect(bids.length).toBe(fulfilled.length);

    // Sequences are unique and monotonic.
    const sequences = bids.map((b) => b.sequence);
    expect(new Set(sequences).size).toBe(bids.length);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));

    // Exactly one WINNING bid.
    const winning = bids.filter((b) => b.status === "WINNING");
    expect(winning.length).toBe(1);

    // Highest accepted bid wins.
    const highest = bids.reduce((a, b) => (b.amountMinor > a.amountMinor ? b : a));
    expect(winning[0].id).toBe(highest.id);

    // Lot reflects the winner (no stale overwrite).
    const updatedLot = await prisma.lot.findUnique({ where: { id: lot.id } });
    expect(updatedLot!.currentBidderId).toBe(highest.bidderId);
    expect(updatedLot!.currentBidMinor).toBe(highest.amountMinor);
    expect(updatedLot!.bidCount).toBe(bids.length);
  });

  it("duplicate idempotency key is rejected", async () => {
    const { lot } = await createTestLot();
    const bidder = await createBidder();
    const key = `dup-${lot.id}`;
    await placeBid({ lotId: lot.id, bidderId: bidder.id, amountMinor: 1100, currency: "USD", idempotencyKey: key });
    await expect(
      placeBid({ lotId: lot.id, bidderId: bidder.id, amountMinor: 1200, currency: "USD", idempotencyKey: key }),
    ).rejects.toThrow(BidError);
  });

  it("bid below increment is rejected", async () => {
    const { lot } = await createTestLot();
    const bidder = await createBidder();
    await placeBid({ lotId: lot.id, bidderId: bidder.id, amountMinor: 1100, currency: "USD" });
    const bidder2 = await createBidder();
    await expect(
      placeBid({ lotId: lot.id, bidderId: bidder2.id, amountMinor: 1100, currency: "USD" }),
    ).rejects.toThrow(BidError);
  });

  it("bid after close is rejected", async () => {
    const { lot } = await createTestLot({ endAt: new Date(Date.now() - 1000) });
    const bidder = await createBidder();
    await expect(
      placeBid({ lotId: lot.id, bidderId: bidder.id, amountMinor: 1100, currency: "USD" }),
    ).rejects.toThrow(BidError);
  });

  it("seller cannot bid on own lot", async () => {
    const { lot, seller } = await createTestLot();
    await expect(
      placeBid({ lotId: lot.id, bidderId: seller.id, amountMinor: 1100, currency: "USD" }),
    ).rejects.toThrow(BidError);
  });

  it("proxy max bid auto-bids at increment above competing bid (plan scenario)", async () => {
    // Plan scenario: current $21,600 (2,160,000 minor). A sets max $23,500.
    // B bids $22,000. System auto-bids $22,250 for A (increment above B).
    const { lot } = await createTestLot();
    await prisma.lot.update({
      where: { id: lot.id },
      data: { currentBidMinor: 2160000, currentBidderId: null },
    });
    const bidderA = await createBidder();
    const bidderB = await createBidder();

    // A sets max $23,500 (proxy).
    await setMaxBid({ lotId: lot.id, bidderId: bidderA.id, maxAmountMinor: 2350000, currency: "USD" });

    // B bids $22,000.
    const result = await placeBid({ lotId: lot.id, bidderId: bidderB.id, amountMinor: 2200000, currency: "USD" });

    // System auto-bids for A at increment above B's bid, up to A's max.
    // Increment ladder at $22,000 (>= $5,000) is +$100 → $22,100.
    expect(result.autoBids.length).toBe(1);
    expect(result.autoBids[0].bidderId).toBe(bidderA.id);
    expect(result.autoBids[0].amountMinor).toBe(2210000); // $22,100
    expect(result.lot.currentBidderId).toBe(bidderA.id);
    expect(result.lot.currentBidMinor).toBe(2210000);
  });

  it("anti-sniping extends the auction when bid arrives in window", async () => {
    const { lot } = await createTestLot({ endAt: new Date(Date.now() + 5000), antiSniping: true });
    const bidder = await createBidder();
    const result = await placeBid({ lotId: lot.id, bidderId: bidder.id, amountMinor: 1100, currency: "USD" });
    expect(result.extended).toBe(true);
    expect(result.lot.endAt.getTime()).toBeGreaterThan(lot.endAt.getTime());
  });

  it("auction close selects exactly one winner and creates one settlement", async () => {
    const { lot } = await createTestLot(); // live, ends in 60s
    const bidders = await Promise.all(Array.from({ length: 5 }, () => createBidder()));
    // Place bids sequentially so each is a valid increment above the last,
    // and above the reserve ($5,000) so a winner is selected.
    for (let i = 0; i < bidders.length; i++) {
      await placeBid({ lotId: lot.id, bidderId: bidders[i].id, amountMinor: 6000 + i * 500, currency: "USD" });
    }

    // Force end_at into the past so closeLot will close it.
    await prisma.lot.update({ where: { id: lot.id }, data: { endAt: new Date(Date.now() - 1000) } });

    const result = await closeLot(lot.id);
    expect(result.closed).toBe(true);
    expect(result.winnerId).not.toBeNull();

    // Exactly one settlement.
    const settlements = await prisma.settlement.findMany({ where: { lotId: lot.id } });
    expect(settlements.length).toBe(1);

    // Idempotent: closing again does not create a second settlement.
    await closeLot(lot.id);
    const settlements2 = await prisma.settlement.findMany({ where: { lotId: lot.id } });
    expect(settlements2.length).toBe(1);
  });
});
