import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, DataTableCell } from "@/components/dashboard/data-table";
import { getAdminLots } from "@/server/readers/admin";
import { formatMoney } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Role } from "@prisma/client";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLotsPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const lots = await getAdminLots();

  return (
    <DashboardShell title="Lots" subtitle="All lots across the platform." nav={adminNav} active="/admin/lots">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All lots</CardTitle>
        </CardHeader>
        <CardContent>
          {lots.length === 0 ? (
            <EmptyState
              icon={<Package className="h-8 w-8" aria-hidden />}
              title="No lots yet"
              description="Lots created by sellers will appear here."
            />
          ) : (
            <DataTable headers={["Lot", "Seller", "Current bid", "Bids", "Status"]}>
              {lots.map((lot) => (
                <tr key={lot.id} className="transition-colors hover:bg-muted/30">
                  <DataTableCell>
                    <p className="font-medium text-foreground">{lot.title}</p>
                    <p className="text-xs text-muted-foreground">{lot.category?.name ?? "Uncategorized"}</p>
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">{lot.seller.name}</DataTableCell>
                  <DataTableCell className="font-semibold tabular-nums text-foreground">
                    {formatMoney(lot.currentBidMinor, lot.currency)}
                  </DataTableCell>
                  <DataTableCell className="tabular-nums text-muted-foreground">{lot.bidCount}</DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={lot.status} />
                  </DataTableCell>
                </tr>
              ))}
            </DataTable>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
