import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireRole } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardShell, StatCard, adminNav } from "@/components/dashboard-shell";
import { Role } from "@prisma/client";
import { ApproveSellerButton } from "@/components/approve-seller";
import { KycStatusButton, CreditLimitForm } from "@/components/trust-forms";
import { Users, Gavel, Package, HandCoins, ScrollText, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

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
    <DashboardShell title="Admin Dashboard" subtitle="Platform oversight and moderation" nav={adminNav} active="/admin">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Users" value={users} icon={Users} accent />
        <StatCard label="Auctions" value={auctions} icon={Gavel} />
        <StatCard label="Lots" value={lots} icon={Package} />
        <StatCard label="Bids" value={bids} icon={HandCoins} />
        <StatCard label="Settlements" value={settlements} icon={ShieldCheck} />
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/users", label: "Users", icon: Users },
          { href: "/admin/sellers", label: "Sellers", icon: ShieldCheck },
          { href: "/admin/auctions", label: "Auctions", icon: Gavel },
          { href: "/admin/moderation", label: "Moderation & Risk", icon: ShieldCheck },
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pending Seller Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingSellers.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-8 w-8" aria-hidden />}
              title="No pending approvals"
              description="All seller applications have been reviewed."
            />
          ) : (
            <ul className="divide-y divide-border">
              {pendingSellers.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{s.email}</p>
                    <p className="text-xs text-muted-foreground">{s.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={s.kycStatus === "VERIFIED" ? "success" : "warning"}>{s.kycStatus}</Badge>
                      <KycStatusButton userId={s.id} status="VERIFIED" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">{s.sellerStatus}</Badge>
                    <ApproveSellerButton userId={s.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-8 w-8" aria-hidden />}
              title="No events"
              description="System events will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium text-foreground">{e.type}</span>
                  <span className="text-xs text-muted-foreground">{e.createdAt.toISOString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
