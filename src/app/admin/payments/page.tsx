import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminSettlements } from "@/server/readers/admin";
import { formatMoney } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Role } from "@prisma/client";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const settlements = await getAdminSettlements();

  return (
    <DashboardShell title="Payments" subtitle="All settlements and payments on the platform." nav={adminNav} active="/admin/payments">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Settlements</CardTitle>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-8 w-8" aria-hidden />}
              title="No settlements yet"
              description="Settlements from won auctions will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {settlements.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{s.lot.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.buyer.name} → {s.lot.seller.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold tabular-nums text-foreground">
                      {formatMoney(s.amountMinor, s.currency)}
                    </p>
                    <StatusBadge status={s.status} />
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
