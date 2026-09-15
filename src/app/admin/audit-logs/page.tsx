import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminAuditLogs } from "@/server/readers/admin";
import { Role } from "@prisma/client";
import { ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const logs = await getAdminAuditLogs();

  return (
    <DashboardShell title="Audit Logs" subtitle="Immutable trail of system actions." nav={adminNav} active="/admin/audit-logs">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-8 w-8" aria-hidden />}
              title="No audit events"
              description="System actions will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{l.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.entity} {l.entityId ? `· ${l.entityId}` : ""} {l.actor ? `· ${l.actor.name}` : ""}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">{l.createdAt.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
