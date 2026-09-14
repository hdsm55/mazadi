import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatTimeRemaining } from "@/lib/utils";
import { LotStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  const lots = await prisma.lot.findMany({
    where: { status: { in: [LotStatus.LIVE, LotStatus.SCHEDULED] } },
    include: { auction: true, category: true },
    orderBy: { endAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Auctions</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lots.map((lot) => (
          <Link key={lot.id} href={`/lots/${lot.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant={lot.status === LotStatus.LIVE ? "success" : "secondary"}>
                    {lot.status === LotStatus.LIVE ? "Live" : "Scheduled"}
                  </Badge>
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
    </div>
  );
}
