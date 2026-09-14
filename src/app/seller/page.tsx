import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireRole } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateAuctionForm, CreateLotForm, PublishAuctionButton } from "@/components/seller-forms";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function SellerDashboard() {
  const user = await requireRole([Role.SELLER, Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const auctions = await prisma.auction.findMany({
    where: { sellerId: user.id },
    include: { lots: true },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.category.findMany();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Seller Dashboard</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Auction</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateAuctionForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Lot</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateLotForm
              auctions={auctions.map((a) => ({ id: a.id, title: a.title }))}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Auctions</CardTitle>
        </CardHeader>
        <CardContent>
          {auctions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No auctions yet.</p>
          ) : (
            <ul className="space-y-4">
              {auctions.map((a) => (
                <li key={a.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.lots.length} lots · {a.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{a.status}</Badge>
                    {a.status === "DRAFT" && <PublishAuctionButton auctionId={a.id} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
