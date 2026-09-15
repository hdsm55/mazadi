import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Role } from "@prisma/client";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  return (
    <DashboardShell title="Disputes" subtitle="Buyer and seller dispute resolution." nav={adminNav} active="/admin/disputes">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Disputes</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<ShieldCheck className="h-8 w-8" aria-hidden />}
            title="No dispute model yet"
            description="Dispute resolution is not yet implemented. When a dispute workflow is added, open cases will appear here."
          />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
