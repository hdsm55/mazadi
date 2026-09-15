import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminSettlements } from "@/server/readers/admin";
import { formatMoney } from "@/lib/utils";
import { Role } from "@prisma/client";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const settlements = await getAdminSettlements();
  const paid = settlements.filter((s) => s.status === "PAID" || s.status === "SETTLED");
  const totalPayoutMinor = paid.reduce((sum, s) => sum + (s.amountMinor - s.sellerCommissionMinor), 0);

  return (
    <DashboardShell title="Payouts" subtitle="Seller payouts across the platform." nav={adminNav} active="/admin/payouts">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Total seller payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold tabular-nums text-foreground">{formatMoney(totalPayoutMinor)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Across {paid.length} settled orders</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Payout breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {paid.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-8 w-8" aria-hidden />}
              title="No payouts yet"
              description="Settled orders will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {paid.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{s.lot.title}</p>
                    <p className="text-sm text-muted-foreground">{s.lot.seller.name}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-foreground">
                    {formatMoney(s.amountMinor - s.sellerCommissionMinor, s.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
