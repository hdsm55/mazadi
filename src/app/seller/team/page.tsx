import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, sellerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Role } from "@prisma/client";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellerTeamPage() {
  const user = await requireRole([Role.SELLER, Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  return (
    <DashboardShell title="Team" subtitle="Manage who can operate your seller account." nav={sellerNav} active="/seller/team">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Team members</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Users className="h-8 w-8" aria-hidden />}
            title="No team members yet"
            description="Team management is coming soon. You are the sole operator of this account."
          />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
