import { PrismaClient, Role, AuctionStatus, LotStatus, ApprovalStatus, Condition } from "@prisma/client";
import { hashPassword } from "../src/server/auth/session";
import { toMinor } from "../src/server/domain/money/money";
import { placeBid, setMaxBid } from "../src/server/domain/auction/bid-engine";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Mazadi demo data...");

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

  // Categories.
  const watches = await prisma.category.create({ data: { name: "Watches", slug: "watches" } });
  const cars = await prisma.category.create({ data: { name: "Cars", slug: "cars" } });
  const art = await prisma.category.create({ data: { name: "Art", slug: "art" } });
  const collectibles = await prisma.category.create({ data: { name: "Collectibles", slug: "collectibles" } });
  const electronics = await prisma.category.create({ data: { name: "Electronics", slug: "electronics" } });

  const pw = await hashPassword("password123");

  // Admin.
  const admin = await prisma.user.create({
    data: { email: "admin@mazadi.com", passwordHash: pw, name: "Platform Admin", role: Role.ADMIN },
  });

  // 5 sellers.
  const sellers = [];
  for (let i = 1; i <= 5; i++) {
    const s = await prisma.user.create({
      data: {
        email: `seller${i}@mazadi.com`,
        passwordHash: pw,
        name: `Auction House ${i}`,
        role: Role.SELLER,
        sellerStatus: "APPROVED",
      },
    });
    sellers.push(s);
  }

  // 10 bidders.
  const bidders = [];
  for (let i = 1; i <= 10; i++) {
    const b = await prisma.user.create({
      data: { email: `bidder${i}@mazadi.com`, passwordHash: pw, name: `Bidder ${i}`, role: Role.BUYER },
    });
    bidders.push(b);
  }

  // ===== Hero Demo: Rolex Daytona =====
  const heroSeller = sellers[0];
  const heroAuction = await prisma.auction.create({
    data: {
      sellerId: heroSeller.id,
      title: "Luxury Watch Auction",
      description: "Premium timepieces from verified sellers.",
      status: AuctionStatus.LIVE,
      approvalStatus: ApprovalStatus.APPROVED,
      startAt: new Date(Date.now() - 3600_000),
      endAt: new Date(Date.now() + 134_000), // ~2:14 remaining
      currency: "USD",
      antiSnipingEnabled: true,
    },
  });

  const heroLot = await prisma.lot.create({
    data: {
      auctionId: heroAuction.id,
      sellerId: heroSeller.id,
      title: "Rolex Daytona 116500LN",
      description: "Stainless steel chronograph, black ceramic bezel. Full set with box and papers.",
      categoryId: watches.id,
      condition: Condition.EXCELLENT,
      startingPriceMinor: toMinor(15000),
      reservePriceMinor: toMinor(20000),
      currency: "USD",
      currentBidMinor: toMinor(21600),
      bidCount: 27,
      startAt: new Date(Date.now() - 3600_000),
      endAt: new Date(Date.now() + 134_000),
      status: LotStatus.LIVE,
      reserveMet: true,
    },
  });

  // Hero scenario: Bidder A has max $23,500. Bidder B bids $22,000.
  // System auto-bids $22,100 for A (increment above B).
  await setMaxBid({
    lotId: heroLot.id,
    bidderId: bidders[0].id,
    maxAmountMinor: toMinor(23500),
    currency: "USD",
  });
  await placeBid({
    lotId: heroLot.id,
    bidderId: bidders[1].id,
    amountMinor: toMinor(22000),
    currency: "USD",
  });

  // ===== Other auctions =====
  const auction2 = await prisma.auction.create({
    data: {
      sellerId: sellers[1].id,
      title: "Classic Cars Auction",
      description: "Vintage and classic automobiles.",
      status: AuctionStatus.LIVE,
      approvalStatus: ApprovalStatus.APPROVED,
      startAt: new Date(Date.now() - 7200_000),
      endAt: new Date(Date.now() + 3600_000),
      currency: "USD",
    },
  });
  await prisma.lot.create({
    data: {
      auctionId: auction2.id,
      sellerId: sellers[1].id,
      title: "1967 Ford Mustang Fastback",
      description: "Restored classic, 289 V8.",
      categoryId: cars.id,
      condition: Condition.GOOD,
      startingPriceMinor: toMinor(25000),
      reservePriceMinor: toMinor(40000),
      currency: "USD",
      currentBidMinor: toMinor(32000),
      bidCount: 12,
      startAt: new Date(Date.now() - 7200_000),
      endAt: new Date(Date.now() + 3600_000),
      status: LotStatus.LIVE,
      reserveMet: false,
    },
  });

  const auction3 = await prisma.auction.create({
    data: {
      sellerId: sellers[2].id,
      title: "Fine Art Auction",
      description: "Contemporary and modern art.",
      status: AuctionStatus.SCHEDULED,
      approvalStatus: ApprovalStatus.APPROVED,
      startAt: new Date(Date.now() + 86400_000),
      endAt: new Date(Date.now() + 90000_000),
      currency: "USD",
    },
  });
  await prisma.lot.create({
    data: {
      auctionId: auction3.id,
      sellerId: sellers[2].id,
      title: "Abstract Painting No. 7",
      description: "Original acrylic on canvas, signed.",
      categoryId: art.id,
      condition: Condition.NEW,
      startingPriceMinor: toMinor(5000),
      currency: "USD",
      startAt: new Date(Date.now() + 86400_000),
      endAt: new Date(Date.now() + 90000_000),
      status: LotStatus.SCHEDULED,
    },
  });

  const auction4 = await prisma.auction.create({
    data: {
      sellerId: sellers[3].id,
      title: "Rare Collectibles",
      description: "Comics, coins, and memorabilia.",
      status: AuctionStatus.ENDED,
      approvalStatus: ApprovalStatus.APPROVED,
      startAt: new Date(Date.now() - 172800_000),
      endAt: new Date(Date.now() - 86400_000),
      currency: "USD",
    },
  });
  const soldLot = await prisma.lot.create({
    data: {
      auctionId: auction4.id,
      sellerId: sellers[3].id,
      title: "Vintage Comic #1",
      description: "First edition, graded.",
      categoryId: collectibles.id,
      condition: Condition.GOOD,
      startingPriceMinor: toMinor(1000),
      reservePriceMinor: toMinor(2000),
      currency: "USD",
      currentBidMinor: toMinor(3500),
      bidCount: 8,
      startAt: new Date(Date.now() - 172800_000),
      endAt: new Date(Date.now() - 86400_000),
      status: LotStatus.SOLD,
      reserveMet: true,
      winnerId: bidders[2].id,
    },
  });
  await prisma.settlement.create({
    data: {
      lotId: soldLot.id,
      auctionId: auction4.id,
      buyerId: bidders[2].id,
      sellerId: sellers[3].id,
      winningBidId: "seed",
      amountMinor: toMinor(3500),
      currency: "USD",
    },
  });

  const auction5 = await prisma.auction.create({
    data: {
      sellerId: sellers[4].id,
      title: "Electronics Clearance",
      description: "Refurbished premium electronics.",
      status: AuctionStatus.LIVE,
      approvalStatus: ApprovalStatus.APPROVED,
      startAt: new Date(Date.now() - 1800_000),
      endAt: new Date(Date.now() + 7200_000),
      currency: "USD",
    },
  });
  await prisma.lot.create({
    data: {
      auctionId: auction5.id,
      sellerId: sellers[4].id,
      title: "MacBook Pro 16\" M3 Max",
      description: "Refurbished, 64GB RAM, 1TB SSD.",
      categoryId: electronics.id,
      condition: Condition.LIKE_NEW,
      startingPriceMinor: toMinor(1500),
      currency: "USD",
      currentBidMinor: toMinor(2100),
      bidCount: 15,
      startAt: new Date(Date.now() - 1800_000),
      endAt: new Date(Date.now() + 7200_000),
      status: LotStatus.LIVE,
      reserveMet: true,
    },
  });

  console.log("Seed complete.");
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
