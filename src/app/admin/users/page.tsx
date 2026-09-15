import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, DataTableCell } from "@/components/dashboard/data-table";
import { getAdminUsers } from "@/server/readers/admin";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Role } from "@prisma/client";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const users = await getAdminUsers();

  return (
    <DashboardShell title="Users" subtitle="All registered users on the platform." nav={adminNav} active="/admin/users">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" aria-hidden />}
              title="No users yet"
              description="Registered users will appear here."
            />
          ) : (
            <DataTable headers={["User", "Role", "KYC", "Seller", "Bids", "Auctions", "Lots"]}>
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-muted/30">
                  <DataTableCell>
                    <p className="font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={u.role} />
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={u.kycStatus} />
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={u.sellerStatus} />
                  </DataTableCell>
                  <DataTableCell className="tabular-nums text-muted-foreground">{u._count.bids}</DataTableCell>
                  <DataTableCell className="tabular-nums text-muted-foreground">{u._count.auctions}</DataTableCell>
                  <DataTableCell className="tabular-nums text-muted-foreground">{u._count.lots}</DataTableCell>
                </tr>
              ))}
            </DataTable>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
