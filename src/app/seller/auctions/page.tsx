import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { DashboardShell, sellerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateAuctionForm, CreateLotForm, PublishAuctionButton } from "@/components/seller-forms";
import { getSellerAuctions } from "@/server/readers/seller";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Role } from "@prisma/client";
import { Gavel, Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellerAuctionsPage() {
  const user = await requireRole([Role.SELLER, Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const auctions = await getSellerAuctions(user.id);
  const categories = await prisma.category.findMany();

  return (
    <DashboardShell title="Auctions" subtitle="Create and manage your auctions." nav={sellerNav} active="/seller/auctions">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create Auction</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateAuctionForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create Lot</CardTitle>
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
          <CardTitle className="text-xl">My auctions</CardTitle>
        </CardHeader>
        <CardContent>
          {auctions.length === 0 ? (
            <EmptyState
              icon={<Gavel className="h-8 w-8" aria-hidden />}
              title="No auctions yet"
              description="Create your first auction to start selling."
            />
          ) : (
            <ul className="divide-y divide-border">
              {auctions.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{a.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.lots.length} lots · {a.currency}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    {a.status === "DRAFT" && <PublishAuctionButton auctionId={a.id} />}
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
