import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { DashboardShell, buyerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getBuyerSettlements } from "@/server/readers/buyer";
import { formatMoney } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerWonPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const settlements = await getBuyerSettlements(user.id);

  return (
    <DashboardShell title="Won" subtitle="Auctions you have won and their settlement status." nav={buyerNav} active="/buyer/won">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Won auctions</CardTitle>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-8 w-8" aria-hidden />}
              title="Nothing won yet"
              description="Your winning lots will appear here once an auction closes."
            />
          ) : (
            <ul className="divide-y divide-border">
              {settlements.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{s.lot.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Buyer premium: {formatMoney(s.buyerPremiumMinor, s.currency)}
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
