import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, sellerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Role } from "@prisma/client";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellerSettingsPage() {
  const user = await requireRole([Role.SELLER, Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  return (
    <DashboardShell title="Settings" subtitle="Configure your seller account." nav={sellerNav} active="/seller/settings">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5 text-accent" aria-hidden />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium text-foreground">{user.name}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-foreground">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Seller status</span>
            <Badge variant={user.sellerStatus === "APPROVED" ? "success" : "warning"}>{user.sellerStatus}</Badge>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
