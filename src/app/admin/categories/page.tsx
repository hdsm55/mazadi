import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { DashboardShell, adminNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminCategories } from "@/server/readers/admin";
import { Role } from "@prisma/client";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const user = await requireRole([Role.ADMIN]).catch(() => null);
  if (!user) redirect("/login");

  const categories = await getAdminCategories();

  return (
    <DashboardShell title="Categories" subtitle="Product categories used across the platform." nav={adminNav} active="/admin/categories">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <EmptyState
              icon={<Package className="h-8 w-8" aria-hidden />}
              title="No categories yet"
              description="Categories will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-sm text-muted-foreground">/{c.slug}</p>
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground">{c._count.lots} lots</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
