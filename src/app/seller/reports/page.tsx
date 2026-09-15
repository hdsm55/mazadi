import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, sellerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSellerAuctions, getSellerSettlements } from "@/server/readers/seller";
import { SimpleBarChart } from "@/components/dashboard/simple-bar-chart";
import { formatMoney } from "@/lib/utils";
import { Role } from "@prisma/client";
import { BarChart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellerReportsPage() {
  const user = await requireRole([Role.SELLER, Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const auctions = await getSellerAuctions(user.id);
  const settlements = await getSellerSettlements(user.id);

  const totalLots = auctions.reduce((sum, a) => sum + a.lots.length, 0);
  const soldLots = settlements.length;
  const sellThrough = totalLots > 0 ? Math.round((soldLots / totalLots) * 100) : 0;
  const totalSalesMinor = settlements.reduce((sum, s) => sum + s.amountMinor, 0);
  const avgFinalPriceMinor = soldLots > 0 ? Math.round(totalSalesMinor / soldLots) : 0;

  const chartData = auctions.map((a) => ({
    label: a.title.length > 18 ? `${a.title.slice(0, 18)}…` : a.title,
    value: a.lots.length,
  }));

  return (
    <DashboardShell title="Reports" subtitle="Simple analytics for your selling performance." nav={sellerNav} active="/seller/reports">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total sales" value={formatMoney(totalSalesMinor)} />
        <Stat label="Sell-through" value={`${sellThrough}%`} />
        <Stat label="Avg final price" value={formatMoney(avgFinalPriceMinor)} />
        <Stat label="Sold lots" value={soldLots} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Lots per auction</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <EmptyState
              icon={<BarChart className="h-8 w-8" aria-hidden />}
              title="No data yet"
              description="Create auctions and lots to see your analytics."
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
