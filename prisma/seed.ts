import {
  PrismaClient,
  Role,
  AuctionStatus,
  LotStatus,
  ApprovalStatus,
  Condition,
  BidType,
  BidStatus,
  MaxBidStatus,
  EventType,
} from "@prisma/client";
import { hashPassword } from "../src/server/auth/session";
import { toMinor } from "../src/server/domain/money/money";

const prisma = new PrismaClient();

// ============================================================
// Helpers
// ============================================================

interface BidSeed {
  bidderIndex: number;
  amountMinor: number;
  type?: BidType;
}

/**
 * Create a realistic bid history for a lot. Bids are inserted with increasing
 * sequence; the last is WINNING, all prior are OUTBID. The lot's current bid,
 * bid count, current bidder, and reserve state are updated to match.
 */
async function seedBidHistory(opts: {
  lotId: string;
  auctionId: string;
  sellerId: string;
  bidders: { id: string }[];
  bids: BidSeed[];
  reservePriceMinor: number | null;
  currency: string;
}) {
  const { lotId, auctionId, sellerId, bidders, bids, reservePriceMinor, currency } = opts;
  if (bids.length === 0) return;

  let sequence = 1;
  const created: { id: string; bidderId: string; amountMinor: number }[] = [];

  for (let i = 0; i < bids.length; i++) {
    const b = bids[i];
    const bidder = bidders[b.bidderIndex];
    const isLast = i === bids.length - 1;
    const bid = await prisma.bid.create({
      data: {
        lotId,
        auctionId,
        bidderId: bidder.id,
        amountMinor: b.amountMinor,
        currency,
        type: b.type ?? BidType.MANUAL,
        source: "web",
        status: isLast ? BidStatus.WINNING : BidStatus.OUTBID,
        sequence,
      },
    });
    created.push({ id: bid.id, bidderId: bidder.id, amountMinor: b.amountMinor });
    sequence += 1;
  }

  const last = created[created.length - 1];
  const reserveMet = reservePriceMinor !== null && last.amountMinor >= reservePriceMinor;

  await prisma.lot.update({
    where: { id: lotId },
    data: {
      currentBidMinor: last.amountMinor,
      currentBidderId: last.bidderId,
      bidCount: created.length,
      reserveMet,
      winningBidId: last.id,
    },
  });

  // Record a BidPlaced event for the final bid.
  await prisma.auctionEvent.create({
    data: {
      auctionId,
      lotId,
      type: EventType.BidPlaced,
      payload: { bidId: last.id, amountMinor: last.amountMinor, bidderId: last.bidderId, sequence },
    },
  });
  if (reserveMet) {
    await prisma.auctionEvent.create({
      data: { auctionId, lotId, type: EventType.ReserveMet, payload: { amountMinor: last.amountMinor } },
    });
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("Seeding Mazadi luxury demo data...");

  // Clean existing demo data (safe: only demo seed).
  await prisma.$transaction([
    prisma.outbox.deleteMany(),
    prisma.auctionEvent.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.settlement.deleteMany(),
    prisma.bid.deleteMany(),
    prisma.maxBid.deleteMany(),
    prisma.watchlist.deleteMany(),
    prisma.lot.deleteMany(),
    prisma.auction.deleteMany(),
    prisma.category.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // ===== Categories =====
  const watches = await prisma.category.create({ data: { name: "Watches", slug: "watches" } });
  const cars = await prisma.category.create({ data: { name: "Cars", slug: "cars" } });
  const art = await prisma.category.create({ data: { name: "Art", slug: "art" } });
  const collectibles = await prisma.category.create({ data: { name: "Collectibles", slug: "collectibles" } });
  const electronics = await prisma.category.create({ data: { name: "Electronics", slug: "electronics" } });

  const pw = await hashPassword("password123");

  // ===== Admin =====
  await prisma.user.create({
    data: { email: "admin@mazadi.com", passwordHash: pw, name: "Platform Admin", role: Role.ADMIN },
  });

  // ===== 5 Sellers (approved auction houses) =====
  const sellerNames = [
    "Geneva Timepieces",
    "Classic Motorworks",
    "Atelier Modern Art",
    "Heritage Collectibles",
    "Luxury Electronics Co.",
  ];
  const sellers: { id: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const s = await prisma.user.create({
      data: {
        email: `seller${i + 1}@mazadi.com`,
        passwordHash: pw,
        name: sellerNames[i],
        role: Role.SELLER,
        sellerStatus: "APPROVED",
      },
    });
    sellers.push(s);
  }

  // ===== 10 Buyers =====
  const bidders: { id: string }[] = [];
  for (let i = 0; i < 10; i++) {
    const b = await prisma.user.create({
      data: { email: `bidder${i + 1}@mazadi.com`, passwordHash: pw, name: `Bidder ${i + 1}`, role: Role.BUYER },
    });
    bidders.push(b);
  }

  const now = Date.now();
  const HOUR = 3600_000;
  const DAY = 24 * HOUR;

  // ============================================================
  // Auction 1 — Luxury Watch Auction (LIVE) — includes Hero Rolex
  // ============================================================
  const watchAuction = await prisma.auction.create({
    data: {
      sellerId: sellers[0].id,
      title: "Luxury Watch Auction",
      description: "Premium timepieces from verified sellers.",
      status: AuctionStatus.LIVE,
      approvalStatus: ApprovalStatus.APPROVED,
      startAt: new Date(now - 2 * HOUR),
      endAt: new Date(now + 4 * HOUR),
      currency: "USD",
      antiSnipingEnabled: true,
    },
  });

  // --- HERO: Rolex Daytona 116500LN ---
  // Current bid $21,600, 27 bids, ~2:14 remaining, reserve met.
  const heroLot = await prisma.lot.create({
    data: {
      auctionId: watchAuction.id,
      sellerId: sellers[0].id,
      title: "Rolex Daytona 116500LN",
      description:
        "Stainless steel chronograph with black ceramic bezel. Full set with box and papers, 2023. Certified by our in-house horologist.",
      categoryId: watches.id,
      condition: Condition.EXCELLENT,
      startingPriceMinor: toMinor(15000),
      reservePriceMinor: toMinor(20000),
      currency: "USD",
      startAt: new Date(now - 2 * HOUR),
      endAt: new Date(now + 134_000), // ~2:14 remaining
      status: LotStatus.LIVE,
    },
  });

  // 27 ascending bids ending at $21,600.
  const heroBidAmounts = [
    15000, 15200, 15500, 15800, 16100, 16400, 16700, 17000, 17300, 17600, 17900, 18200, 18500, 18800, 19100, 19400,
    19700, 20000, 20300, 20600, 20900, 21200, 21500, 21800, 22100, 22400, 21600,
  ];
  // Alternate bidders realistically (bidder1..bidder9).
  const heroBids: BidSeed[] = heroBidAmounts.map((amt, i) => ({
    bidderIndex: (i % 9) + 1, // bidders[1..9]
    amountMinor: toMinor(amt),
    type: i % 3 === 0 ? BidType.PROXY : BidType.MANUAL,
  }));
  await seedBidHistory({
    lotId: heroLot.id,
    auctionId: watchAuction.id,
    sellerId: sellers[0].id,
    bidders,
    bids: heroBids,
    reservePriceMinor: toMinor(20000),
    currency: "USD",
  });

  // --- Other watch lots ---
  const watchLots: Array<{
    title: string;
    desc: string;
    condition: Condition;
    start: number;
    end: number;
    status: LotStatus;
    starting: number;
    reserve?: number;
    bids?: BidSeed[];
  }> = [
    {
      title: "Audemars Piguet Royal Oak 15500ST",
      desc: "Blue dial, 41mm, 2022. Complete with box and papers.",
      condition: Condition.EXCELLENT,
      start: now - 3 * HOUR,
      end: now + 6 * HOUR,
      status: LotStatus.LIVE,
      starting: 32000,
      reserve: 42000,
      bids: [
        { bidderIndex: 2, amountMinor: toMinor(32000) },
        { bidderIndex: 5, amountMinor: toMinor(33000) },
        { bidderIndex: 2, amountMinor: toMinor(34000) },
        { bidderIndex: 7, amountMinor: toMinor(35000) },
        { bidderIndex: 5, amountMinor: toMinor(36000) },
        { bidderIndex: 2, amountMinor: toMinor(37000) },
        { bidderIndex: 7, amountMinor: toMinor(38000) },
        { bidderIndex: 5, amountMinor: toMinor(39000) },
        { bidderIndex: 2, amountMinor: toMinor(40000) },
        { bidderIndex: 7, amountMinor: toMinor(41000) },
        { bidderIndex: 5, amountMinor: toMinor(42000) },
        { bidderIndex: 2, amountMinor: toMinor(43000) },
      ],
    },
    {
      title: "Patek Philippe Nautilus 5711/1A",
      desc: "Blue dial, steel bracelet, 2021. Unworn, full set.",
      condition: Condition.LIKE_NEW,
      start: now - 5 * HOUR,
      end: now + 2 * HOUR,
      status: LotStatus.LIVE,
      starting: 55000,
      reserve: 70000,
      bids: [
        { bidderIndex: 3, amountMinor: toMinor(55000) },
        { bidderIndex: 6, amountMinor: toMinor(56000) },
        { bidderIndex: 3, amountMinor: toMinor(57500) },
        { bidderIndex: 8, amountMinor: toMinor(59000) },
        { bidderIndex: 6, amountMinor: toMinor(60500) },
        { bidderIndex: 3, amountMinor: toMinor(62000) },
        { bidderIndex: 8, amountMinor: toMinor(63500) },
        { bidderIndex: 6, amountMinor: toMinor(65000) },
        { bidderIndex: 3, amountMinor: toMinor(66500) },
        { bidderIndex: 8, amountMinor: toMinor(68000) },
        { bidderIndex: 6, amountMinor: toMinor(69500) },
        { bidderIndex: 3, amountMinor: toMinor(71000) },
      ],
    },
    {
      title: "Rolex Submariner Date 126610LN",
      desc: "Black dial, 41mm, 2022. Excellent condition, full set.",
      condition: Condition.EXCELLENT,
      start: now - 1 * HOUR,
      end: now + 8 * HOUR,
      status: LotStatus.LIVE,
      starting: 12000,
      reserve: 15000,
      bids: [
        { bidderIndex: 1, amountMinor: toMinor(12000) },
        { bidderIndex: 4, amountMinor: toMinor(12500) },
        { bidderIndex: 1, amountMinor: toMinor(13000) },
        { bidderIndex: 9, amountMinor: toMinor(13500) },
        { bidderIndex: 4, amountMinor: toMinor(14000) },
        { bidderIndex: 1, amountMinor: toMinor(14500) },
        { bidderIndex: 9, amountMinor: toMinor(15000) },
        { bidderIndex: 4, amountMinor: toMinor(15500) },
        { bidderIndex: 1, amountMinor: toMinor(16000) },
      ],
    },
    {
      title: "Omega Speedmaster Moonwatch Professional",
      desc: "Hesalite crystal, 2021. Serviced, with box and papers.",
      condition: Condition.EXCELLENT,
      start: now - 30 * 60_000,
      end: now + 10 * HOUR,
      status: LotStatus.LIVE,
      starting: 4500,
      reserve: 6000,
      bids: [
        { bidderIndex: 2, amountMinor: toMinor(4500) },
        { bidderIndex: 5, amountMinor: toMinor(4700) },
        { bidderIndex: 2, amountMinor: toMinor(4900) },
        { bidderIndex: 7, amountMinor: toMinor(5100) },
        { bidderIndex: 5, amountMinor: toMinor(5300) },
        { bidderIndex: 2, amountMinor: toMinor(5500) },
        { bidderIndex: 7, amountMinor: toMinor(5700) },
        { bidderIndex: 5, amountMinor: toMinor(5900) },
        { bidderIndex: 2, amountMinor: toMinor(6100) },
      ],
    },
    {
      title: "Jaeger-LeCoultre Reverso Tribute",
      desc: "Monoface, silver dial, 2020. Full set.",
      condition: Condition.EXCELLENT,
      start: now - 2 * HOUR,
      end: now + 5 * HOUR,
      status: LotStatus.LIVE,
      starting: 8000,
      reserve: 10000,
      bids: [
        { bidderIndex: 4, amountMinor: toMinor(8000) },
        { bidderIndex: 6, amountMinor: toMinor(8300) },
        { bidderIndex: 4, amountMinor: toMinor(8600) },
        { bidderIndex: 9, amountMinor: toMinor(8900) },
        { bidderIndex: 6, amountMinor: toMinor(9200) },
        { bidderIndex: 4, amountMinor: toMinor(9500) },
        { bidderIndex: 9, amountMinor: toMinor(9800) },
        { bidderIndex: 6, amountMinor: toMinor(10100) },
      ],
    },
    {
      title: "Cartier Santos de Cartier",
      desc: "Large model, steel, 2022. Full set.",
      condition: Condition.LIKE_NEW,
      start: now - 4 * HOUR,
      end: now + 3 * HOUR,
      status: LotStatus.LIVE,
      starting: 6000,
      reserve: 7500,
      bids: [
        { bidderIndex: 3, amountMinor: toMinor(6000) },
        { bidderIndex: 8, amountMinor: toMinor(6200) },
        { bidderIndex: 3, amountMinor: toMinor(6400) },
        { bidderIndex: 8, amountMinor: toMinor(6600) },
        { bidderIndex: 3, amountMinor: toMinor(6800) },
        { bidderIndex: 8, amountMinor: toMinor(7000) },
        { bidderIndex: 3, amountMinor: toMinor(7200) },
        { bidderIndex: 8, amountMinor: toMinor(7400) },
        { bidderIndex: 3, amountMinor: toMinor(7600) },
      ],
    },
    {
      title: "Grand Seiko Spring Drive SBGA211",
      desc: "Snowflake dial, 2021. Excellent, full set.",
      condition: Condition.EXCELLENT,
      start: now - 6 * HOUR,
      end: now + 1 * HOUR,
      status: LotStatus.LIVE,
      starting: 3500,
      reserve: 4500,
      bids: [
        { bidderIndex: 1, amountMinor: toMinor(3500) },
        { bidderIndex: 5, amountMinor: toMinor(3700) },
        { bidderIndex: 1, amountMinor: toMinor(3900) },
        { bidderIndex: 7, amountMinor: toMinor(4100) },
        { bidderIndex: 5, amountMinor: toMinor(4300) },
        { bidderIndex: 1, amountMinor: toMinor(4500) },
        { bidderIndex: 7, amountMinor: toMinor(4700) },
      ],
    },
    {
      title: "IWC Portugieser Chronograph",
      desc: "Blue dial, 2020. Serviced, full set.",
      condition: Condition.GOOD,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 5500,
      reserve: 7000,
    },
    {
      title: "Hublot Big Bang Unico",
      desc: "Ceramic, 2021. Full set.",
      condition: Condition.EXCELLENT,
      start: now + 2 * DAY,
      end: now + 4 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 9000,
      reserve: 11000,
    },
  ];

  for (const l of watchLots) {
    const lot = await prisma.lot.create({
      data: {
        auctionId: watchAuction.id,
        sellerId: sellers[0].id,
        title: l.title,
        description: l.desc,
        categoryId: watches.id,
        condition: l.condition,
        startingPriceMinor: toMinor(l.starting),
        reservePriceMinor: l.reserve ? toMinor(l.reserve) : null,
        currency: "USD",
        startAt: new Date(l.start),
        endAt: new Date(l.end),
        status: l.status,
      },
    });
    if (l.bids && l.bids.length > 0) {
      await seedBidHistory({
        lotId: lot.id,
        auctionId: watchAuction.id,
        sellerId: sellers[0].id,
        bidders,
        bids: l.bids,
        reservePriceMinor: l.reserve ? toMinor(l.reserve) : null,
        currency: "USD",
      });
    }
  }

  // ============================================================
  // Auction 2 — Classic Cars Auction (LIVE)
  // ============================================================
  const carAuction = await prisma.auction.create({
    data: {
      sellerId: sellers[1].id,
      title: "Classic Cars Auction",
      description: "Vintage and classic automobiles from private collections.",
      status: AuctionStatus.LIVE,
      approvalStatus: ApprovalStatus.APPROVED,
      startAt: new Date(now - 6 * HOUR),
      endAt: new Date(now + 8 * HOUR),
      currency: "USD",
      antiSnipingEnabled: true,
    },
  });

  const carLots: Array<{
    title: string;
    desc: string;
    condition: Condition;
    start: number;
    end: number;
    status: LotStatus;
    starting: number;
    reserve?: number;
    bids?: BidSeed[];
  }> = [
    {
      title: "1967 Ford Mustang Fastback",
      desc: "Restored classic, 289 V8, 4-speed. Matching numbers.",
      condition: Condition.GOOD,
      start: now - 6 * HOUR,
      end: now + 8 * HOUR,
      status: LotStatus.LIVE,
      starting: 25000,
      reserve: 40000,
      bids: [
        { bidderIndex: 2, amountMinor: toMinor(25000) },
        { bidderIndex: 5, amountMinor: toMinor(26000) },
        { bidderIndex: 2, amountMinor: toMinor(27500) },
        { bidderIndex: 7, amountMinor: toMinor(29000) },
        { bidderIndex: 5, amountMinor: toMinor(30500) },
        { bidderIndex: 2, amountMinor: toMinor(32000) },
        { bidderIndex: 7, amountMinor: toMinor(33500) },
        { bidderIndex: 5, amountMinor: toMinor(35000) },
        { bidderIndex: 2, amountMinor: toMinor(36500) },
        { bidderIndex: 7, amountMinor: toMinor(38000) },
        { bidderIndex: 5, amountMinor: toMinor(39500) },
        { bidderIndex: 2, amountMinor: toMinor(41000) },
      ],
    },
    {
      title: "1970 Porsche 911S",
      desc: "Original 2.2L flat-six, restored to concours. Rare color.",
      condition: Condition.EXCELLENT,
      start: now - 4 * HOUR,
      end: now + 6 * HOUR,
      status: LotStatus.LIVE,
      starting: 60000,
      reserve: 85000,
      bids: [
        { bidderIndex: 3, amountMinor: toMinor(60000) },
        { bidderIndex: 6, amountMinor: toMinor(62000) },
        { bidderIndex: 3, amountMinor: toMinor(64000) },
        { bidderIndex: 8, amountMinor: toMinor(66000) },
        { bidderIndex: 6, amountMinor: toMinor(68000) },
        { bidderIndex: 3, amountMinor: toMinor(70000) },
        { bidderIndex: 8, amountMinor: toMinor(72000) },
        { bidderIndex: 6, amountMinor: toMinor(74000) },
        { bidderIndex: 3, amountMinor: toMinor(76000) },
        { bidderIndex: 8, amountMinor: toMinor(78000) },
        { bidderIndex: 6, amountMinor: toMinor(80000) },
        { bidderIndex: 3, amountMinor: toMinor(82000) },
        { bidderIndex: 8, amountMinor: toMinor(84000) },
        { bidderIndex: 6, amountMinor: toMinor(86000) },
      ],
    },
    {
      title: "1957 Mercedes-Benz 300SL Gullwing",
      desc: "Iconic gullwing, restored. One of the most desirable classics.",
      condition: Condition.EXCELLENT,
      start: now - 8 * HOUR,
      end: now + 2 * HOUR,
      status: LotStatus.LIVE,
      starting: 900000,
      reserve: 1200000,
      bids: [
        { bidderIndex: 4, amountMinor: toMinor(900000) },
        { bidderIndex: 9, amountMinor: toMinor(925000) },
        { bidderIndex: 4, amountMinor: toMinor(950000) },
        { bidderIndex: 9, amountMinor: toMinor(975000) },
        { bidderIndex: 4, amountMinor: toMinor(1000000) },
        { bidderIndex: 9, amountMinor: toMinor(1025000) },
        { bidderIndex: 4, amountMinor: toMinor(1050000) },
        { bidderIndex: 9, amountMinor: toMinor(1075000) },
        { bidderIndex: 4, amountMinor: toMinor(1100000) },
        { bidderIndex: 9, amountMinor: toMinor(1125000) },
        { bidderIndex: 4, amountMinor: toMinor(1150000) },
        { bidderIndex: 9, amountMinor: toMinor(1175000) },
        { bidderIndex: 4, amountMinor: toMinor(1200000) },
        { bidderIndex: 9, amountMinor: toMinor(1225000) },
      ],
    },
    {
      title: "1963 Jaguar E-Type Series 1",
      desc: "3.8L roadster, matching numbers, recent restoration.",
      condition: Condition.GOOD,
      start: now - 3 * HOUR,
      end: now + 7 * HOUR,
      status: LotStatus.LIVE,
      starting: 70000,
      reserve: 95000,
      bids: [
        { bidderIndex: 1, amountMinor: toMinor(70000) },
        { bidderIndex: 5, amountMinor: toMinor(72000) },
        { bidderIndex: 1, amountMinor: toMinor(74000) },
        { bidderIndex: 7, amountMinor: toMinor(76000) },
        { bidderIndex: 5, amountMinor: toMinor(78000) },
        { bidderIndex: 1, amountMinor: toMinor(80000) },
        { bidderIndex: 7, amountMinor: toMinor(82000) },
        { bidderIndex: 5, amountMinor: toMinor(84000) },
        { bidderIndex: 1, amountMinor: toMinor(86000) },
        { bidderIndex: 7, amountMinor: toMinor(88000) },
        { bidderIndex: 5, amountMinor: toMinor(90000) },
        { bidderIndex: 1, amountMinor: toMinor(92000) },
        { bidderIndex: 7, amountMinor: toMinor(94000) },
        { bidderIndex: 5, amountMinor: toMinor(96000) },
      ],
    },
    {
      title: "1985 Lamborghini Countach 5000 QV",
      desc: "Iconic wedge supercar, low mileage, documented history.",
      condition: Condition.GOOD,
      start: now - 2 * HOUR,
      end: now + 9 * HOUR,
      status: LotStatus.LIVE,
      starting: 250000,
      reserve: 350000,
      bids: [
        { bidderIndex: 2, amountMinor: toMinor(250000) },
        { bidderIndex: 6, amountMinor: toMinor(260000) },
        { bidderIndex: 2, amountMinor: toMinor(270000) },
        { bidderIndex: 8, amountMinor: toMinor(280000) },
        { bidderIndex: 6, amountMinor: toMinor(290000) },
        { bidderIndex: 2, amountMinor: toMinor(300000) },
        { bidderIndex: 8, amountMinor: toMinor(310000) },
        { bidderIndex: 6, amountMinor: toMinor(320000) },
        { bidderIndex: 2, amountMinor: toMinor(330000) },
        { bidderIndex: 8, amountMinor: toMinor(340000) },
        { bidderIndex: 6, amountMinor: toMinor(350000) },
        { bidderIndex: 2, amountMinor: toMinor(360000) },
      ],
    },
    {
      title: "1965 Shelby Cobra 427",
      desc: "Continuation series, 427 side-oiler, race-ready.",
      condition: Condition.EXCELLENT,
      start: now - 5 * HOUR,
      end: now + 4 * HOUR,
      status: LotStatus.LIVE,
      starting: 500000,
      reserve: 700000,
      bids: [
        { bidderIndex: 3, amountMinor: toMinor(500000) },
        { bidderIndex: 9, amountMinor: toMinor(520000) },
        { bidderIndex: 3, amountMinor: toMinor(540000) },
        { bidderIndex: 9, amountMinor: toMinor(560000) },
        { bidderIndex: 3, amountMinor: toMinor(580000) },
        { bidderIndex: 9, amountMinor: toMinor(600000) },
        { bidderIndex: 3, amountMinor: toMinor(620000) },
        { bidderIndex: 9, amountMinor: toMinor(640000) },
        { bidderIndex: 3, amountMinor: toMinor(660000) },
        { bidderIndex: 9, amountMinor: toMinor(680000) },
        { bidderIndex: 3, amountMinor: toMinor(700000) },
        { bidderIndex: 9, amountMinor: toMinor(720000) },
      ],
    },
    {
      title: "1969 Chevrolet Camaro Z28",
      desc: "Numbers-matching, restored. Classic muscle.",
      condition: Condition.GOOD,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 45000,
      reserve: 60000,
    },
    {
      title: "1995 Ferrari F355 Berlinetta",
      desc: "6-speed manual, low miles, recent major service.",
      condition: Condition.GOOD,
      start: now + 2 * DAY,
      end: now + 4 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 80000,
      reserve: 100000,
    },
  ];

  for (const l of carLots) {
    const lot = await prisma.lot.create({
      data: {
        auctionId: carAuction.id,
        sellerId: sellers[1].id,
        title: l.title,
        description: l.desc,
        categoryId: cars.id,
        condition: l.condition,
        startingPriceMinor: toMinor(l.starting),
        reservePriceMinor: l.reserve ? toMinor(l.reserve) : null,
        currency: "USD",
        startAt: new Date(l.start),
        endAt: new Date(l.end),
        status: l.status,
      },
    });
    if (l.bids && l.bids.length > 0) {
      await seedBidHistory({
        lotId: lot.id,
        auctionId: carAuction.id,
        sellerId: sellers[1].id,
        bidders,
        bids: l.bids,
        reservePriceMinor: l.reserve ? toMinor(l.reserve) : null,
        currency: "USD",
      });
    }
  }

  // ============================================================
  // Auction 3 — Fine Art Auction (SCHEDULED)
  // ============================================================
  const artAuction = await prisma.auction.create({
    data: {
      sellerId: sellers[2].id,
      title: "Fine Art Auction",
      description: "Contemporary and modern art from private collections.",
      status: AuctionStatus.SCHEDULED,
      approvalStatus: ApprovalStatus.APPROVED,
      startAt: new Date(now + 1 * DAY),
      endAt: new Date(now + 3 * DAY),
      currency: "USD",
      antiSnipingEnabled: true,
    },
  });

  const artLots: Array<{
    title: string;
    desc: string;
    condition: Condition;
    start: number;
    end: number;
    status: LotStatus;
    starting: number;
    reserve?: number;
  }> = [
    {
      title: "Abstract Painting No. 7",
      desc: "Original acrylic on canvas, signed by artist.",
      condition: Condition.NEW,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 5000,
      reserve: 8000,
    },
    {
      title: "Banksy Screen Print — Girl with Balloon",
      desc: "Signed and numbered edition, framed.",
      condition: Condition.EXCELLENT,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 15000,
      reserve: 25000,
    },
    {
      title: "Picasso Lithograph — Toros",
      desc: "Signed lithograph, limited edition.",
      condition: Condition.GOOD,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 8000,
      reserve: 12000,
    },
    {
      title: "Monet Water Lilies Study",
      desc: "Oil on canvas, attributed, provenance documented.",
      condition: Condition.GOOD,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 200000,
      reserve: 300000,
    },
    {
      title: "Warhol Campbell's Soup Can",
      desc: "Screen print, signed, edition of 250.",
      condition: Condition.EXCELLENT,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 30000,
      reserve: 45000,
    },
    {
      title: "Basquiat Untitled Skull",
      desc: "Mixed media on canvas, authenticated.",
      condition: Condition.GOOD,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 500000,
      reserve: 750000,
    },
    {
      title: "Rothko Color Field",
      desc: "Oil on canvas, estate provenance.",
      condition: Condition.GOOD,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 400000,
      reserve: 600000,
    },
    {
      title: "Hockney Pool Painting",
      desc: "Acrylic on canvas, signed.",
      condition: Condition.EXCELLENT,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 100000,
      reserve: 150000,
    },
    {
      title: "Kandinsky Composition Study",
      desc: "Watercolor and ink on paper, signed.",
      condition: Condition.GOOD,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 25000,
      reserve: 40000,
    },
    {
      title: "Dalí Melting Clock Sculpture",
      desc: "Bronze sculpture, numbered edition.",
      condition: Condition.EXCELLENT,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 18000,
      reserve: 28000,
    },
  ];

  for (const l of artLots) {
    await prisma.lot.create({
      data: {
        auctionId: artAuction.id,
        sellerId: sellers[2].id,
        title: l.title,
        description: l.desc,
        categoryId: art.id,
        condition: l.condition,
        startingPriceMinor: toMinor(l.starting),
        reservePriceMinor: l.reserve ? toMinor(l.reserve) : null,
        currency: "USD",
        startAt: new Date(l.start),
        endAt: new Date(l.end),
        status: l.status,
      },
    });
  }

  // ============================================================
  // Auction 4 — Rare Collectibles (ENDED — sold + unsold)
  // ============================================================
  const collectAuction = await prisma.auction.create({
    data: {
      sellerId: sellers[3].id,
      title: "Rare Collectibles",
      description: "Comics, coins, and memorabilia.",
      status: AuctionStatus.ENDED,
      approvalStatus: ApprovalStatus.APPROVED,
      startAt: new Date(now - 3 * DAY),
      endAt: new Date(now - 1 * DAY),
      currency: "USD",
      antiSnipingEnabled: true,
    },
  });

  const collectLots: Array<{
    title: string;
    desc: string;
    condition: Condition;
    status: LotStatus;
    starting: number;
    reserve?: number;
    bids?: BidSeed[];
    winnerIndex?: number;
  }> = [
    {
      title: "Vintage Comic #1 — Action Comics",
      desc: "First edition, professionally graded 6.0.",
      condition: Condition.GOOD,
      status: LotStatus.SOLD,
      starting: 1000,
      reserve: 2000,
      winnerIndex: 2,
      bids: [
        { bidderIndex: 1, amountMinor: toMinor(1000) },
        { bidderIndex: 3, amountMinor: toMinor(1200) },
        { bidderIndex: 1, amountMinor: toMinor(1400) },
        { bidderIndex: 5, amountMinor: toMinor(1600) },
        { bidderIndex: 3, amountMinor: toMinor(1800) },
        { bidderIndex: 1, amountMinor: toMinor(2000) },
        { bidderIndex: 5, amountMinor: toMinor(2200) },
        { bidderIndex: 3, amountMinor: toMinor(2400) },
        { bidderIndex: 1, amountMinor: toMinor(2600) },
        { bidderIndex: 5, amountMinor: toMinor(2800) },
        { bidderIndex: 3, amountMinor: toMinor(3000) },
        { bidderIndex: 5, amountMinor: toMinor(3200) },
        { bidderIndex: 3, amountMinor: toMinor(3400) },
        { bidderIndex: 5, amountMinor: toMinor(3600) },
      ],
    },
    {
      title: "1952 Mickey Mantle Baseball Card",
      desc: "Topps, graded 5.0. Iconic rookie card.",
      condition: Condition.GOOD,
      status: LotStatus.SOLD,
      starting: 50000,
      reserve: 80000,
      winnerIndex: 6,
      bids: [
        { bidderIndex: 2, amountMinor: toMinor(50000) },
        { bidderIndex: 4, amountMinor: toMinor(52000) },
        { bidderIndex: 2, amountMinor: toMinor(54000) },
        { bidderIndex: 7, amountMinor: toMinor(56000) },
        { bidderIndex: 4, amountMinor: toMinor(58000) },
        { bidderIndex: 2, amountMinor: toMinor(60000) },
        { bidderIndex: 7, amountMinor: toMinor(62000) },
        { bidderIndex: 4, amountMinor: toMinor(64000) },
        { bidderIndex: 2, amountMinor: toMinor(66000) },
        { bidderIndex: 7, amountMinor: toMinor(68000) },
        { bidderIndex: 4, amountMinor: toMinor(70000) },
        { bidderIndex: 7, amountMinor: toMinor(72000) },
        { bidderIndex: 4, amountMinor: toMinor(74000) },
        { bidderIndex: 7, amountMinor: toMinor(76000) },
        { bidderIndex: 4, amountMinor: toMinor(78000) },
        { bidderIndex: 7, amountMinor: toMinor(80000) },
        { bidderIndex: 4, amountMinor: toMinor(82000) },
      ],
    },
    {
      title: "First Edition Harry Potter",
      desc: "Philosopher's Stone, first printing, fine condition.",
      condition: Condition.EXCELLENT,
      status: LotStatus.SOLD,
      starting: 20000,
      reserve: 30000,
      winnerIndex: 4,
      bids: [
        { bidderIndex: 1, amountMinor: toMinor(20000) },
        { bidderIndex: 5, amountMinor: toMinor(21000) },
        { bidderIndex: 1, amountMinor: toMinor(22000) },
        { bidderIndex: 8, amountMinor: toMinor(23000) },
        { bidderIndex: 5, amountMinor: toMinor(24000) },
        { bidderIndex: 1, amountMinor: toMinor(25000) },
        { bidderIndex: 8, amountMinor: toMinor(26000) },
        { bidderIndex: 5, amountMinor: toMinor(27000) },
        { bidderIndex: 1, amountMinor: toMinor(28000) },
        { bidderIndex: 8, amountMinor: toMinor(29000) },
        { bidderIndex: 5, amountMinor: toMinor(30000) },
        { bidderIndex: 1, amountMinor: toMinor(31000) },
      ],
    },
    {
      title: "Ancient Roman Gold Aureus",
      desc: "Julius Caesar, certified authentic.",
      condition: Condition.GOOD,
      status: LotStatus.SOLD,
      starting: 8000,
      reserve: 12000,
      winnerIndex: 8,
      bids: [
        { bidderIndex: 3, amountMinor: toMinor(8000) },
        { bidderIndex: 6, amountMinor: toMinor(8500) },
        { bidderIndex: 3, amountMinor: toMinor(9000) },
        { bidderIndex: 9, amountMinor: toMinor(9500) },
        { bidderIndex: 6, amountMinor: toMinor(10000) },
        { bidderIndex: 3, amountMinor: toMinor(10500) },
        { bidderIndex: 9, amountMinor: toMinor(11000) },
        { bidderIndex: 6, amountMinor: toMinor(11500) },
        { bidderIndex: 3, amountMinor: toMinor(12000) },
        { bidderIndex: 9, amountMinor: toMinor(12500) },
        { bidderIndex: 6, amountMinor: toMinor(13000) },
      ],
    },
    {
      title: "Signed Beatles Album — Abbey Road",
      desc: "All four signatures, authenticated.",
      condition: Condition.GOOD,
      status: LotStatus.SOLD,
      starting: 15000,
      reserve: 25000,
      winnerIndex: 1,
      bids: [
        { bidderIndex: 2, amountMinor: toMinor(15000) },
        { bidderIndex: 4, amountMinor: toMinor(16000) },
        { bidderIndex: 2, amountMinor: toMinor(17000) },
        { bidderIndex: 7, amountMinor: toMinor(18000) },
        { bidderIndex: 4, amountMinor: toMinor(19000) },
        { bidderIndex: 2, amountMinor: toMinor(20000) },
        { bidderIndex: 7, amountMinor: toMinor(21000) },
        { bidderIndex: 4, amountMinor: toMinor(22000) },
        { bidderIndex: 2, amountMinor: toMinor(23000) },
        { bidderIndex: 7, amountMinor: toMinor(24000) },
        { bidderIndex: 4, amountMinor: toMinor(25000) },
        { bidderIndex: 2, amountMinor: toMinor(26000) },
      ],
    },
    {
      title: "1909 T206 Honus Wagner",
      desc: "The most famous baseball card, graded 2.0.",
      condition: Condition.FAIR,
      status: LotStatus.UNSOLD,
      starting: 300000,
      reserve: 500000,
    },
    {
      title: "Rare Whisky Collection — Macallan 25",
      desc: "Set of 5 bottles, unopened, original packaging.",
      condition: Condition.EXCELLENT,
      status: LotStatus.UNSOLD,
      starting: 20000,
      reserve: 35000,
    },
    {
      title: "Star Wars Action Figure — 1978",
      desc: "Original Kenner, sealed, graded.",
      condition: Condition.GOOD,
      status: LotStatus.UNSOLD,
      starting: 5000,
      reserve: 8000,
    },
  ];

  for (const l of collectLots) {
    const lot = await prisma.lot.create({
      data: {
        auctionId: collectAuction.id,
        sellerId: sellers[3].id,
        title: l.title,
        description: l.desc,
        categoryId: collectibles.id,
        condition: l.condition,
        startingPriceMinor: toMinor(l.starting),
        reservePriceMinor: l.reserve ? toMinor(l.reserve) : null,
        currency: "USD",
        startAt: new Date(now - 3 * DAY),
        endAt: new Date(now - 1 * DAY),
        status: l.status,
      },
    });

    if (l.bids && l.bids.length > 0) {
      await seedBidHistory({
        lotId: lot.id,
        auctionId: collectAuction.id,
        sellerId: sellers[3].id,
        bidders,
        bids: l.bids,
        reservePriceMinor: l.reserve ? toMinor(l.reserve) : null,
        currency: "USD",
      });
    }

    // For SOLD lots: set winner + create settlement.
    if (l.status === LotStatus.SOLD && l.winnerIndex !== undefined) {
      const winner = bidders[l.winnerIndex];
      const finalBid = await prisma.bid.findFirst({
        where: { lotId: lot.id },
        orderBy: { sequence: "desc" },
      });
      await prisma.lot.update({
        where: { id: lot.id },
        data: { winnerId: winner.id, winningBidId: finalBid?.id ?? null },
      });
      await prisma.settlement.create({
        data: {
          lotId: lot.id,
          auctionId: collectAuction.id,
          buyerId: winner.id,
          sellerId: sellers[3].id,
          winningBidId: finalBid?.id ?? "seed",
          amountMinor: lot.currentBidMinor,
          currency: "USD",
          buyerPremiumMinor: Math.round(lot.currentBidMinor * 0.2),
          sellerCommissionMinor: Math.round(lot.currentBidMinor * 0.1),
          status: "PAID",
        },
      });
      await prisma.auctionEvent.create({
        data: {
          auctionId: collectAuction.id,
          lotId: lot.id,
          type: EventType.AuctionClosed,
          payload: { winnerId: winner.id, amountMinor: lot.currentBidMinor },
        },
      });
    }
  }

  // ============================================================
  // Auction 5 — Electronics Clearance (LIVE)
  // ============================================================
  const elecAuction = await prisma.auction.create({
    data: {
      sellerId: sellers[4].id,
      title: "Electronics Clearance",
      description: "Refurbished premium electronics.",
      status: AuctionStatus.LIVE,
      approvalStatus: ApprovalStatus.APPROVED,
      startAt: new Date(now - 2 * HOUR),
      endAt: new Date(now + 6 * HOUR),
      currency: "USD",
      antiSnipingEnabled: true,
    },
  });

  const elecLots: Array<{
    title: string;
    desc: string;
    condition: Condition;
    start: number;
    end: number;
    status: LotStatus;
    starting: number;
    reserve?: number;
    bids?: BidSeed[];
  }> = [
    {
      title: "MacBook Pro 16\" M3 Max",
      desc: "Refurbished, 64GB RAM, 1TB SSD. 90-day warranty.",
      condition: Condition.LIKE_NEW,
      start: now - 2 * HOUR,
      end: now + 6 * HOUR,
      status: LotStatus.LIVE,
      starting: 1500,
      reserve: 2200,
      bids: [
        { bidderIndex: 1, amountMinor: toMinor(1500) },
        { bidderIndex: 4, amountMinor: toMinor(1600) },
        { bidderIndex: 1, amountMinor: toMinor(1700) },
        { bidderIndex: 6, amountMinor: toMinor(1800) },
        { bidderIndex: 4, amountMinor: toMinor(1900) },
        { bidderIndex: 1, amountMinor: toMinor(2000) },
        { bidderIndex: 6, amountMinor: toMinor(2100) },
        { bidderIndex: 4, amountMinor: toMinor(2200) },
        { bidderIndex: 1, amountMinor: toMinor(2300) },
        { bidderIndex: 6, amountMinor: toMinor(2400) },
        { bidderIndex: 4, amountMinor: toMinor(2500) },
        { bidderIndex: 1, amountMinor: toMinor(2600) },
        { bidderIndex: 6, amountMinor: toMinor(2700) },
        { bidderIndex: 4, amountMinor: toMinor(2800) },
        { bidderIndex: 1, amountMinor: toMinor(2900) },
      ],
    },
    {
      title: "Sony A7R V Camera",
      desc: "61MP full-frame, like new, low shutter count.",
      condition: Condition.LIKE_NEW,
      start: now - 1 * HOUR,
      end: now + 8 * HOUR,
      status: LotStatus.LIVE,
      starting: 2500,
      reserve: 3200,
      bids: [
        { bidderIndex: 2, amountMinor: toMinor(2500) },
        { bidderIndex: 5, amountMinor: toMinor(2600) },
        { bidderIndex: 2, amountMinor: toMinor(2700) },
        { bidderIndex: 7, amountMinor: toMinor(2800) },
        { bidderIndex: 5, amountMinor: toMinor(2900) },
        { bidderIndex: 2, amountMinor: toMinor(3000) },
        { bidderIndex: 7, amountMinor: toMinor(3100) },
        { bidderIndex: 5, amountMinor: toMinor(3200) },
        { bidderIndex: 2, amountMinor: toMinor(3300) },
      ],
    },
    {
      title: "Leica M11 Rangefinder",
      desc: "Digital rangefinder, 60MP, boxed with accessories.",
      condition: Condition.EXCELLENT,
      start: now - 3 * HOUR,
      end: now + 5 * HOUR,
      status: LotStatus.LIVE,
      starting: 6000,
      reserve: 7500,
      bids: [
        { bidderIndex: 3, amountMinor: toMinor(6000) },
        { bidderIndex: 8, amountMinor: toMinor(6200) },
        { bidderIndex: 3, amountMinor: toMinor(6400) },
        { bidderIndex: 9, amountMinor: toMinor(6600) },
        { bidderIndex: 8, amountMinor: toMinor(6800) },
        { bidderIndex: 3, amountMinor: toMinor(7000) },
        { bidderIndex: 9, amountMinor: toMinor(7200) },
        { bidderIndex: 8, amountMinor: toMinor(7400) },
        { bidderIndex: 3, amountMinor: toMinor(7600) },
      ],
    },
    {
      title: "Bang & Olufsen Beosound A9",
      desc: "Premium wireless speaker, walnut, excellent.",
      condition: Condition.EXCELLENT,
      start: now - 4 * HOUR,
      end: now + 4 * HOUR,
      status: LotStatus.LIVE,
      starting: 1500,
      reserve: 2000,
      bids: [
        { bidderIndex: 4, amountMinor: toMinor(1500) },
        { bidderIndex: 6, amountMinor: toMinor(1600) },
        { bidderIndex: 4, amountMinor: toMinor(1700) },
        { bidderIndex: 9, amountMinor: toMinor(1800) },
        { bidderIndex: 6, amountMinor: toMinor(1900) },
        { bidderIndex: 4, amountMinor: toMinor(2000) },
        { bidderIndex: 9, amountMinor: toMinor(2100) },
      ],
    },
    {
      title: "Apple Vision Pro",
      desc: "256GB, sealed, full warranty.",
      condition: Condition.NEW,
      start: now - 5 * HOUR,
      end: now + 3 * HOUR,
      status: LotStatus.LIVE,
      starting: 2800,
      reserve: 3400,
      bids: [
        { bidderIndex: 1, amountMinor: toMinor(2800) },
        { bidderIndex: 5, amountMinor: toMinor(2900) },
        { bidderIndex: 1, amountMinor: toMinor(3000) },
        { bidderIndex: 7, amountMinor: toMinor(3100) },
        { bidderIndex: 5, amountMinor: toMinor(3200) },
        { bidderIndex: 1, amountMinor: toMinor(3300) },
        { bidderIndex: 7, amountMinor: toMinor(3400) },
        { bidderIndex: 5, amountMinor: toMinor(3500) },
      ],
    },
    {
      title: "Hasselblad X2D 100C",
      desc: "100MP medium format, like new, boxed.",
      condition: Condition.LIKE_NEW,
      start: now - 6 * HOUR,
      end: now + 2 * HOUR,
      status: LotStatus.LIVE,
      starting: 7000,
      reserve: 8500,
      bids: [
        { bidderIndex: 2, amountMinor: toMinor(7000) },
        { bidderIndex: 8, amountMinor: toMinor(7200) },
        { bidderIndex: 2, amountMinor: toMinor(7400) },
        { bidderIndex: 9, amountMinor: toMinor(7600) },
        { bidderIndex: 8, amountMinor: toMinor(7800) },
        { bidderIndex: 2, amountMinor: toMinor(8000) },
        { bidderIndex: 9, amountMinor: toMinor(8200) },
        { bidderIndex: 8, amountMinor: toMinor(8400) },
        { bidderIndex: 2, amountMinor: toMinor(8600) },
      ],
    },
    {
      title: "Focal Utopia Headphones",
      desc: "Flagship open-back, excellent, with case.",
      condition: Condition.EXCELLENT,
      start: now - 2 * HOUR,
      end: now + 7 * HOUR,
      status: LotStatus.LIVE,
      starting: 3000,
      reserve: 3800,
      bids: [
        { bidderIndex: 3, amountMinor: toMinor(3000) },
        { bidderIndex: 6, amountMinor: toMinor(3100) },
        { bidderIndex: 3, amountMinor: toMinor(3200) },
        { bidderIndex: 7, amountMinor: toMinor(3300) },
        { bidderIndex: 6, amountMinor: toMinor(3400) },
        { bidderIndex: 3, amountMinor: toMinor(3500) },
        { bidderIndex: 7, amountMinor: toMinor(3600) },
        { bidderIndex: 6, amountMinor: toMinor(3700) },
        { bidderIndex: 3, amountMinor: toMinor(3800) },
      ],
    },
    {
      title: "DJI Inspire 3",
      desc: "Cinema drone, full kit, low flight time.",
      condition: Condition.LIKE_NEW,
      start: now + 1 * DAY,
      end: now + 3 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 8000,
      reserve: 10000,
    },
    {
      title: "Nintendo Switch OLED",
      desc: "Sealed, white, full warranty.",
      condition: Condition.NEW,
      start: now + 2 * DAY,
      end: now + 4 * DAY,
      status: LotStatus.SCHEDULED,
      starting: 300,
      reserve: 400,
    },
  ];

  for (const l of elecLots) {
    const lot = await prisma.lot.create({
      data: {
        auctionId: elecAuction.id,
        sellerId: sellers[4].id,
        title: l.title,
        description: l.desc,
        categoryId: electronics.id,
        condition: l.condition,
        startingPriceMinor: toMinor(l.starting),
        reservePriceMinor: l.reserve ? toMinor(l.reserve) : null,
        currency: "USD",
        startAt: new Date(l.start),
        endAt: new Date(l.end),
        status: l.status,
      },
    });
    if (l.bids && l.bids.length > 0) {
      await seedBidHistory({
        lotId: lot.id,
        auctionId: elecAuction.id,
        sellerId: sellers[4].id,
        bidders,
        bids: l.bids,
        reservePriceMinor: l.reserve ? toMinor(l.reserve) : null,
        currency: "USD",
      });
    }
  }

  // ============================================================
  // Summary
  // ============================================================
  const lotCount = await prisma.lot.count();
  const auctionCount = await prisma.auction.count();
  const bidCount = await prisma.bid.count();
  const userCount = await prisma.user.count();

  console.log("Seed complete.");
  console.log(`  Lots: ${lotCount}`);
  console.log(`  Auctions: ${auctionCount}`);
  console.log(`  Bids: ${bidCount}`);
  console.log(`  Users: ${userCount}`);
  console.log("Demo accounts (password: password123):");
  console.log("  admin@mazadi.com (ADMIN)");
  console.log("  seller1@mazadi.com ... seller5@mazadi.com (SELLER)");
  console.log("  bidder1@mazadi.com ... bidder10@mazadi.com (BUYER)");
  console.log(`Hero lot: ${heroLot.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
