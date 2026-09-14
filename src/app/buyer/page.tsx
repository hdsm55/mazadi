import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardShell, StatCard, buyerNav } from "@/components/dashboard-shell";
import { formatMoney } from "@/lib/utils";
import { BidStatus } from "@prisma/client";
import { Gavel, Trophy, Bell } from "lucide-react";

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

  const winningCount = myBids.filter((b) => b.status === BidStatus.WINNING).length;
  const outbidCount = myBids.filter((b) => b.status === BidStatus.OUTBID).length;
  const totalSpent = won.reduce((sum, s) => sum + s.amountMinor, 0);

  return (
    <DashboardShell title="Buyer Dashboard" subtitle={`Welcome back, ${user.name}`} nav={buyerNav} active="/buyer">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active bids" value={myBids.length} icon={Gavel} accent />
        <StatCard label="Winning" value={winningCount} icon={Gavel} />
        <StatCard label="Outbid" value={outbidCount} icon={Gavel} />
        <StatCard label="Total spent" value={formatMoney(totalSpent)} icon={Trophy} accent />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recent Bids</CardTitle>
          </CardHeader>
          <CardContent>
            {myBids.length === 0 ? (
              <EmptyState
                icon={<Gavel className="h-8 w-8" aria-hidden />}
                title="No bids yet"
                description="Browse live auctions and place your first bid."
              />
            ) : (
              <ul className="divide-y divide-border">
                {myBids.map((bid) => (
                  <li key={bid.id} className="flex items-center justify-between py-3 text-sm">
                    <span className="font-medium text-foreground">{bid.lot.title}</span>
                    <span className="tabular-nums text-foreground">{formatMoney(bid.amountMinor, bid.currency)}</span>
                    <Badge variant={bid.status === BidStatus.WINNING ? "success" : bid.status === BidStatus.OUTBID ? "destructive" : "secondary"}>
                      {bid.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Won Auctions</CardTitle>
          </CardHeader>
          <CardContent>
            {won.length === 0 ? (
              <EmptyState
                icon={<Trophy className="h-8 w-8" aria-hidden />}
                title="Nothing won yet"
                description="Your winning lots will appear here."
              />
            ) : (
              <ul className="divide-y divide-border">
                {won.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                    <span className="font-medium text-foreground">{s.lot.title}</span>
                    <span className="tabular-nums text-foreground">{formatMoney(s.amountMinor, s.currency)}</span>
                    <Badge variant={s.status === "PENDING_PAYMENT" ? "warning" : "success"}>{s.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-8 w-8" aria-hidden />}
              title="All caught up"
              description="You'll be notified when you're outbid or win an auction."
            />
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3 py-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-muted-foreground/40" : "bg-accent"}`} aria-hidden />
                  <div>
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
