import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminUsers } from "@/server/readers/admin";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Role } from "@prisma/client";
import { Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAuctionHousesPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const users = await getAdminUsers();
  const sellers = users.filter((u) => u.role === "SELLER" || u.sellerStatus === "APPROVED");

  return (
    <DashboardShell title="Auction Houses" subtitle="Approved sellers operating on the platform." nav={adminNav} active="/admin/auction-houses">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Approved sellers</CardTitle>
        </CardHeader>
        <CardContent>
          {sellers.length === 0 ? (
            <EmptyState
              icon={<Store className="h-8 w-8" aria-hidden />}
              title="No auction houses yet"
              description="Approved sellers will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {sellers.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s.sellerStatus} />
                    <StatusBadge status={s.kycStatus} />
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
