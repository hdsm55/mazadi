import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, DataTableCell } from "@/components/dashboard/data-table";
import { getAdminAuctions } from "@/server/readers/admin";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Role } from "@prisma/client";
import { Gavel } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAuctionsPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const auctions = await getAdminAuctions();

  return (
    <DashboardShell title="Auctions" subtitle="All auctions across the platform." nav={adminNav} active="/admin/auctions">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All auctions</CardTitle>
        </CardHeader>
        <CardContent>
          {auctions.length === 0 ? (
            <EmptyState
              icon={<Gavel className="h-8 w-8" aria-hidden />}
              title="No auctions yet"
              description="Auctions created by sellers will appear here."
            />
          ) : (
            <DataTable headers={["Auction", "Seller", "Lots", "Bids", "Status"]}>
              {auctions.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-muted/30">
                  <DataTableCell>
                    <p className="font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.currency}</p>
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">{a.seller.name}</DataTableCell>
                  <DataTableCell className="tabular-nums text-muted-foreground">{a._count.lots}</DataTableCell>
                  <DataTableCell className="tabular-nums text-muted-foreground">{a._count.bids}</DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={a.status} />
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
