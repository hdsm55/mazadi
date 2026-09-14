import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatTimeRemaining } from "@/lib/utils";
import { LotStatus, AuctionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const liveLots = await prisma.lot.findMany({
    where: { status: LotStatus.LIVE },
    include: { auction: true, category: true },
    orderBy: { endAt: "asc" },
    take: 8,
  });

  const heroLot = liveLots.find((l) => l.title.includes("Rolex")) ?? liveLots[0];

  return (
    <div className="space-y-12">
      {/* Hero */}
      {heroLot && (
        <section className="rounded-2xl border bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="bg-white/10 text-white">
                Live Now
              </Badge>
              <h1 className="text-3xl font-bold md:text-4xl">{heroLot.title}</h1>
              <p className="max-w-xl text-white/70">{heroLot.description}</p>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-white/60">Current Bid</p>
                  <p className="text-3xl font-bold">{formatMoney(heroLot.currentBidMinor, heroLot.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Time Remaining</p>
                  <p className="text-3xl font-bold tabular-nums">{formatTimeRemaining(heroLot.endAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Bids</p>
                  <p className="text-3xl font-bold">{heroLot.bidCount}</p>
                </div>
              </div>
              <Link
                href={`/lots/${heroLot.id}`}
                className="inline-flex h-11 items-center rounded-md bg-white px-6 text-sm font-semibold text-slate-900 hover:bg-white/90"
              >
                Place a Bid
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Live auctions */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Live Now</h2>
          <Link href="/auctions" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {liveLots.map((lot) => (
            <Link key={lot.id} href={`/lots/${lot.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="success">Live</Badge>
                    <span className="text-xs text-muted-foreground">{lot.category?.name ?? "General"}</span>
                  </div>
                  <CardTitle className="text-lg">{lot.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-2xl font-bold">{formatMoney(lot.currentBidMinor, lot.currency)}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{lot.bidCount} bids</span>
                    <span className="tabular-nums">{formatTimeRemaining(lot.endAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
