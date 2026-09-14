import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { LotCard } from "@/components/lot-card";
import { Countdown } from "@/components/countdown";
import { formatMoney } from "@/lib/utils";
import { LotStatus, AuctionStatus } from "@prisma/client";
import { Gavel, ShieldCheck, Globe2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const liveLots = await prisma.lot.findMany({
    where: { status: LotStatus.LIVE },
    include: { auction: true, category: true },
    orderBy: { endAt: "asc" },
    take: 12,
  });

  const scheduledLots = await prisma.lot.findMany({
    where: { status: LotStatus.SCHEDULED },
    include: { auction: true, category: true },
    orderBy: { startAt: "asc" },
    take: 4,
  });

  const soldLots = await prisma.lot.findMany({
    where: { status: LotStatus.SOLD },
    include: { auction: true, category: true },
    orderBy: { updatedAt: "desc" },
    take: 4,
  });

  const heroLot = liveLots.find((l) => l.title.includes("Rolex")) ?? liveLots[0];

  // Ending soon = live lots sorted by soonest end.
  const endingSoon = [...liveLots].sort((a, b) => a.endAt.getTime() - b.endAt.getTime()).slice(0, 4);
  const trending = [...liveLots].sort((a, b) => b.bidCount - a.bidCount).slice(0, 4);

  const auctionHouses = await prisma.user.findMany({
    where: { role: "SELLER", sellerStatus: "APPROVED" },
    take: 6,
  });

  return (
    <div className="space-y-16">
      {/* ================= HERO ================= */}
      {heroLot && (
        <section className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-lift">
          {/* Ambient luxury background */}
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,hsl(var(--accent)/0.6),transparent_45%),radial-gradient(circle_at_85%_75%,hsl(var(--accent)/0.4),transparent_40%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          <div className="relative grid gap-8 p-8 md:p-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Badge variant="success" className="gap-1.5">
                  <span className="live-dot" aria-hidden />
                  Live Now
                </Badge>
                <span className="text-sm text-primary-foreground/70">{heroLot.category?.name ?? "Featured"}</span>
              </div>

              <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl">
                {heroLot.title}
              </h1>
              <p className="max-w-xl text-base text-primary-foreground/75 md:text-lg">{heroLot.description}</p>

              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-primary-foreground/60">
                    Current bid
                  </p>
                  <p className="text-4xl font-bold tabular-nums text-accent md:text-5xl">
                    {formatMoney(heroLot.currentBidMinor, heroLot.currency)}
                  </p>
                </div>
                <div className="h-12 w-px bg-primary-foreground/15" aria-hidden />
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-primary-foreground/60">
                    Time remaining
                  </p>
                  <Countdown
                    endAt={heroLot.endAt.toISOString()}
                    urgent
                    className="text-3xl font-bold md:text-4xl"
                  />
                </div>
                <div className="h-12 w-px bg-primary-foreground/15" aria-hidden />
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-primary-foreground/60">
                    Bids
                  </p>
                  <p className="text-3xl font-bold tabular-nums md:text-4xl">{heroLot.bidCount}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href={`/lots/${heroLot.id}`} className="btn-gold !px-8 !py-4 !text-base">
                  Place a Bid
                </Link>
                <Link
                  href="/auctions"
                  className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/25 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                >
                  Browse Auctions
                </Link>
              </div>
            </div>

            {/* Visual panel */}
            <div className="hidden lg:block">
              <div className="relative mx-auto flex aspect-square max-w-md items-center justify-center rounded-2xl border border-primary-foreground/10 bg-gradient-to-br from-primary via-primary/95 to-accent/60 shadow-lift">
                <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_50%_40%,hsl(var(--accent)/0.7),transparent_55%)]" />
                <span className="font-serif text-[10rem] font-semibold leading-none text-primary-foreground/90">
                  {heroLot.title.charAt(0)}
                </span>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl bg-black/30 px-4 py-3 backdrop-blur">
                  <span className="text-sm font-medium text-primary-foreground/80">Reserve</span>
                  <Badge variant={heroLot.reserveMet ? "success" : "warning"}>
                    {heroLot.reserveMet ? "Met" : "Not met"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= TRUST BAR ================= */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: ShieldCheck, title: "Verified Sellers", desc: "Every auction house is vetted" },
          { icon: Globe2, title: "Global Marketplace", desc: "Bid from anywhere in the world" },
          { icon: Clock, title: "Live Realtime", desc: "Instant bid updates via WebSocket" },
          { icon: Gavel, title: "Secure Bidding", desc: "Deterministic, race-free engine" },
        ].map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-soft"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <f.icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-foreground">{f.title}</p>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ================= LIVE NOW ================= */}
      <section>
        <SectionHeader
          eyebrow="Live Now"
          title="Auctions happening right now"
          description="Place your bid before the hammer falls."
          href="/auctions"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {liveLots.slice(0, 4).map((lot) => (
            <LotCard key={lot.id} lot={lot} />
          ))}
        </div>
      </section>

      {/* ================= ENDING SOON ================= */}
      <section>
        <SectionHeader
          eyebrow="Ending Soon"
          title="Don't miss the final moments"
          href="/auctions"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {endingSoon.map((lot) => (
            <LotCard key={lot.id} lot={lot} />
          ))}
        </div>
      </section>

      {/* ================= TRENDING ================= */}
      <section>
        <SectionHeader
          eyebrow="Trending"
          title="Most active lots"
          description="The lots generating the most bidding action."
          href="/auctions"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((lot) => (
            <LotCard key={lot.id} lot={lot} />
          ))}
        </div>
      </section>

      {/* ================= FEATURED AUCTION HOUSES ================= */}
      <section>
        <SectionHeader
          eyebrow="Auction Houses"
          title="Featured auction houses"
          href="/auctions"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {auctionHouses.map((house) => (
            <div
              key={house.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-serif text-xl font-semibold text-primary-foreground">
                {house.name.charAt(0)}
              </span>
              <div>
                <p className="font-semibold text-foreground">{house.name}</p>
                <p className="flex items-center gap-1 text-sm text-success">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Verified
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= UPCOMING ================= */}
      {scheduledLots.length > 0 && (
        <section>
          <SectionHeader
            eyebrow="Upcoming"
            title="Coming soon"
            description="Preview lots scheduled for upcoming auctions."
            href="/auctions"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {scheduledLots.map((lot) => (
              <LotCard key={lot.id} lot={lot} />
            ))}
          </div>
        </section>
      )}

      {/* ================= RECENTLY SOLD ================= */}
      {soldLots.length > 0 && (
        <section>
          <SectionHeader
            eyebrow="Recently Sold"
            title="Recent results"
            description="See what the market is paying."
            href="/auctions"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {soldLots.map((lot) => (
              <LotCard key={lot.id} lot={lot} />
            ))}
          </div>
        </section>
      )}

      {/* ================= CTA ================= */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent/80 p-10 text-center text-primary-foreground shadow-lift md:p-14">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_50%_0%,hsl(var(--accent)/0.8),transparent_60%)]" />
        <div className="relative space-y-4">
          <h2 className="font-serif text-3xl font-semibold md:text-4xl">
            Ready to place your first bid?
          </h2>
          <p className="mx-auto max-w-xl text-primary-foreground/75">
            Join thousands of collectors and dealers on the world's most trusted auction platform.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/register" className="btn-gold !px-8 !py-3.5">
              Create Account
            </Link>
            <Link
              href="/auctions"
              className="inline-flex items-center rounded-lg border border-primary-foreground/25 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              Explore Auctions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
