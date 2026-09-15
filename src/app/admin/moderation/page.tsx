import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminRiskFlags } from "@/server/readers/admin";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Role } from "@prisma/client";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const flags = await getAdminRiskFlags();

  return (
    <DashboardShell title="Moderation & Risk" subtitle="Fraud flags and risk signals from the trust module." nav={adminNav} active="/admin/moderation">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Risk flags</CardTitle>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-8 w-8" aria-hidden />}
              title="No risk flags"
              description="Fraud signals detected by the trust module will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {flags.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{f.kind}</p>
                    <p className="text-sm text-muted-foreground">{f.message}</p>
                    <p className="text-xs text-muted-foreground/70">{f.user.name} · {f.createdAt.toLocaleString()}</p>
                  </div>
                  <StatusBadge status={f.level} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
