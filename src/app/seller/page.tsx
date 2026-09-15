import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireRole } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardShell, StatCard, sellerNav } from "@/components/dashboard-shell";
import { CreateAuctionForm, CreateLotForm, PublishAuctionButton } from "@/components/seller-forms";
import { Role } from "@prisma/client";
import { Gavel, Package, Wallet, BarChart, ArrowRight } from "lucide-react";
import Link from "next/link";

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

  const totalLots = auctions.reduce((sum, a) => sum + a.lots.length, 0);
  const liveAuctions = auctions.filter((a) => a.status === "LIVE").length;
  const draftAuctions = auctions.filter((a) => a.status === "DRAFT").length;

  return (
    <DashboardShell title="Seller Dashboard" subtitle={`Manage your auctions and lots, ${user.name}`} nav={sellerNav} active="/seller">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Auctions" value={auctions.length} icon={Gavel} accent />
        <StatCard label="Live now" value={liveAuctions} icon={Gavel} />
        <StatCard label="Drafts" value={draftAuctions} icon={Package} />
        <StatCard label="Total lots" value={totalLots} icon={BarChart} />
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/seller/auctions", label: "Auctions", icon: Gavel },
          { href: "/seller/lots", label: "Lots", icon: Package },
          { href: "/seller/orders", label: "Orders & Payments", icon: Wallet },
          { href: "/seller/reports", label: "Reports", icon: BarChart },
        ].map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.href}
              href={q.href}
              className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-accent/40"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon className="h-4 w-4 text-accent" aria-hidden />
                {q.label}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          );
        })}
      </div>

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
          <CardTitle className="text-xl">My Auctions</CardTitle>
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
                    <Badge variant={a.status === "LIVE" ? "success" : a.status === "DRAFT" ? "secondary" : "outline"}>
                      {a.status}
                    </Badge>
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
