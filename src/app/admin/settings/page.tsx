import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Role } from "@prisma/client";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  return (
    <DashboardShell title="Settings" subtitle="Platform configuration." nav={adminNav} active="/admin/settings">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5 text-accent" aria-hidden />
            Platform settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">Operator</span>
            <span className="font-medium text-foreground">{user.name}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium text-foreground">{user.role}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Additional platform configuration (fees, currencies, moderation rules) will be added here.
          </p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
