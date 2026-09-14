import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireRole } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const [users, auctions, lots, bids, settlements, events] = await Promise.all([
    prisma.user.count(),
    prisma.auction.count(),
    prisma.lot.count(),
    prisma.bid.count(),
    prisma.settlement.count(),
    prisma.auctionEvent.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  const pendingSellers = await prisma.user.findMany({
    where: { sellerStatus: "PENDING_REVIEW" },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Users", users],
          ["Auctions", auctions],
          ["Lots", lots],
          ["Bids", bids],
          ["Settlements", settlements],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending Seller Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingSellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending approvals.</p>
          ) : (
            <ul className="space-y-2">
              {pendingSellers.map((s) => (
                <li key={s.id} className="flex items-center justify-between border-b pb-2 text-sm">
                  <span>{s.email}</span>
                  <Badge variant="secondary">{s.sellerStatus}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between border-b pb-2 text-sm">
                <span className="font-medium">{e.type}</span>
                <span className="text-muted-foreground">{e.createdAt.toISOString()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
