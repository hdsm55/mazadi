import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, sellerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSellerLots } from "@/server/readers/seller";
import { formatMoney } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Role } from "@prisma/client";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellerDraftsPage() {
  const user = await requireRole([Role.SELLER, Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const lots = await getSellerLots(user.id);
  const drafts = lots.filter((l) => l.status === "DRAFT");

  return (
    <DashboardShell title="Drafts" subtitle="Lots not yet published to a live auction." nav={sellerNav} active="/seller/drafts">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Draft lots</CardTitle>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <EmptyState
              icon={<Package className="h-8 w-8" aria-hidden />}
              title="No drafts"
              description="Draft lots you haven't published yet will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {drafts.map((lot) => (
                <li key={lot.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{lot.title}</p>
                    <p className="text-sm text-muted-foreground">{lot.auction.title}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold tabular-nums text-foreground">
                      {formatMoney(lot.startingPriceMinor, lot.currency)}
                    </p>
                    <StatusBadge status={lot.status} />
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
