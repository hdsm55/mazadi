import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { BidStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function BuyerDashboard() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const myBids = await prisma.bid.findMany({
    where: { bidderId: user.id },
    include: { lot: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const won = await prisma.settlement.findMany({
    where: { buyerId: user.id },
    include: { lot: true },
  });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">My Bids</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Bids</CardTitle>
          </CardHeader>
          <CardContent>
            {myBids.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven't placed any bids yet.</p>
            ) : (
              <ul className="space-y-3">
                {myBids.map((bid) => (
                  <li key={bid.id} className="flex items-center justify-between border-b pb-2 text-sm">
                    <span className="font-medium">{bid.lot.title}</span>
                    <span>{formatMoney(bid.amountMinor, bid.currency)}</span>
                    <Badge variant={bid.status === BidStatus.WINNING ? "success" : "secondary"}>{bid.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Won Auctions</CardTitle>
          </CardHeader>
          <CardContent>
            {won.length === 0 ? (
              <p className="text-sm text-muted-foreground">No won auctions yet.</p>
            ) : (
              <ul className="space-y-3">
                {won.map((s) => (
                  <li key={s.id} className="flex items-center justify-between border-b pb-2 text-sm">
                    <span className="font-medium">{s.lot.title}</span>
                    <span>{formatMoney(s.amountMinor, s.currency)}</span>
                    <Badge variant="secondary">{s.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li key={n.id} className="border-b pb-2">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
