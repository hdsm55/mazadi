import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SimpleBarChart } from "@/components/dashboard/simple-bar-chart";
import { formatMoney } from "@/lib/utils";
import { Role } from "@prisma/client";
import { BarChart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const [users, auctions, lots, bids, settlements] = await Promise.all([
    prisma.user.count(),
    prisma.auction.count(),
    prisma.lot.count(),
    prisma.bid.count(),
    prisma.settlement.findMany(),
  ]);

  const gmvMinor = settlements.reduce((sum, s) => sum + s.amountMinor, 0);
  const commissionMinor = settlements.reduce((sum, s) => sum + s.sellerCommissionMinor, 0);

  const chartData = [
    { label: "Users", value: users },
    { label: "Auctions", value: auctions },
    { label: "Lots", value: lots },
    { label: "Bids", value: bids },
    { label: "Settlements", value: settlements.length },
  ];

  return (
    <DashboardShell title="Reports" subtitle="Platform-wide analytics." nav={adminNav} active="/admin/reports">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="GMV (approx)" value={formatMoney(gmvMinor)} />
        <Stat label="Commission" value={formatMoney(commissionMinor)} />
        <Stat label="Auctions" value={auctions} />
        <Stat label="Bids" value={bids} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Platform activity</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.every((d) => d.value === 0) ? (
            <EmptyState
              icon={<BarChart className="h-8 w-8" aria-hidden />}
              title="No data yet"
              description="Platform activity will appear here."
            />
          ) : (
            <SimpleBarChart data={chartData} />
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
