import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { DashboardShell, buyerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getBuyerNotifications } from "@/server/readers/buyer";
import { Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerNotificationsPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const notifications = await getBuyerNotifications(user.id);

  return (
    <DashboardShell title="Notifications" subtitle="Alerts about your bids, auctions and payments." nav={buyerNav} active="/buyer/notifications">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-8 w-8" aria-hidden />}
              title="All caught up"
              description="You'll be notified when you're outbid or win an auction."
            />
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3 py-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-muted-foreground/40" : "bg-accent"}`}
                    aria-hidden
                  />
                  <div>
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">{n.createdAt.toLocaleString()}</p>
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
