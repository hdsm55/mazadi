import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminPendingSellers } from "@/server/readers/admin";
import { ApproveSellerButton } from "@/components/approve-seller";
import { KycStatusButton } from "@/components/trust-forms";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Role } from "@prisma/client";
import { Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSellersPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const pendingSellers = await getAdminPendingSellers();

  return (
    <DashboardShell title="Sellers" subtitle="Review and approve seller applications." nav={adminNav} active="/admin/sellers">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pending seller approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingSellers.length === 0 ? (
            <EmptyState
              icon={<Store className="h-8 w-8" aria-hidden />}
              title="No pending approvals"
              description="All seller applications have been reviewed."
            />
          ) : (
            <ul className="divide-y divide-border">
              {pendingSellers.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{s.email}</p>
                    <p className="text-xs text-muted-foreground">{s.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={s.kycStatus} />
                      <KycStatusButton userId={s.id} status="VERIFIED" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">{s.sellerStatus}</Badge>
                    <ApproveSellerButton userId={s.id} />
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
