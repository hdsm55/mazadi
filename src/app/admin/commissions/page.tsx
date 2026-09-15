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

export default async function AdminCommissionsPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const settlements = await getAdminSettlements();
  const totalCommissionMinor = settlements.reduce((sum, s) => sum + s.sellerCommissionMinor, 0);

  return (
    <DashboardShell title="Commissions" subtitle="Platform commission earned from sales." nav={adminNav} active="/admin/commissions">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Total commission</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold tabular-nums text-foreground">{formatMoney(totalCommissionMinor)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Across {settlements.length} settlements</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Commission per order</CardTitle>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-8 w-8" aria-hidden />}
              title="No commissions yet"
              description="Commissions from settled orders will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {settlements.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{s.lot.title}</p>
                    <p className="text-sm text-muted-foreground">{s.lot.seller.name}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-foreground">
                    {formatMoney(s.sellerCommissionMinor, s.currency)}
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
