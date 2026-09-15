import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, sellerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSellerSettlements } from "@/server/readers/seller";
import { formatMoney } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Role } from "@prisma/client";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellerOrdersPage() {
  const user = await requireRole([Role.SELLER, Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const settlements = await getSellerSettlements(user.id);

  return (
    <DashboardShell title="Orders & Payments" subtitle="Settlements for lots you have sold." nav={sellerNav} active="/seller/orders">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-8 w-8" aria-hidden />}
              title="No orders yet"
              description="When a buyer wins and pays for one of your lots, the order appears here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {settlements.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{s.lot.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Buyer: {s.buyer.name} · Commission: {formatMoney(s.sellerCommissionMinor, s.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-2xl font-bold tabular-nums text-foreground">
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
