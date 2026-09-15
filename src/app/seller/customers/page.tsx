import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, sellerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSellerCustomers } from "@/server/readers/seller";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Role } from "@prisma/client";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellerCustomersPage() {
  const user = await requireRole([Role.SELLER, Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const customers = await getSellerCustomers(user.id);

  return (
    <DashboardShell title="Customers" subtitle="Buyers who have won lots from you." nav={sellerNav} active="/seller/customers">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your customers</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" aria-hidden />}
              title="No customers yet"
              description="Buyers who win your lots will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {customers.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.kycStatus} />
                    <StatusBadge status={c.phoneVerified ? "VERIFIED" : "UNVERIFIED"} />
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
