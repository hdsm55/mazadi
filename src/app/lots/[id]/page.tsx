import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { BidPanel } from "@/components/bid-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lot = await prisma.lot.findUnique({
    where: { id },
    include: { auction: true, category: true, seller: true, bids: { orderBy: { sequence: "desc" }, take: 20 } },
  });
  if (!lot) notFound();

  const user = await getSessionUser();

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant={lot.status === "LIVE" ? "success" : "secondary"}>{lot.status}</Badge>
            <span className="text-sm text-muted-foreground">{lot.category?.name ?? "General"}</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold">{lot.title}</h1>
          <p className="mt-2 text-muted-foreground">{lot.description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bid History</CardTitle>
          </CardHeader>
          <CardContent>
            {lot.bids.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bids yet.</p>
            ) : (
              <ul className="space-y-2">
                {lot.bids.map((bid) => (
                  <li key={bid.id} className="flex items-center justify-between border-b pb-2 text-sm">
                    <span className="text-muted-foreground">#{bid.sequence}</span>
                    <span className="font-medium">{formatMoney(bid.amountMinor, bid.currency)}</span>
                    <span className="text-muted-foreground">{bid.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <BidPanel
          lotId={lot.id}
          userId={user?.id ?? null}
          isSeller={user?.id === lot.sellerId}
          initial={{
            currentBidMinor: lot.currentBidMinor,
            currentBidderId: lot.currentBidderId,
            bidCount: lot.bidCount,
            reserveMet: lot.reserveMet,
            endAt: lot.endAt.toISOString(),
            status: lot.status,
          }}
        />
      </div>
    </div>
  );
}
