import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { DashboardShell, buyerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getBuyerWatchlist } from "@/server/readers/buyer";
import { formatMoney } from "@/lib/utils";
import { Countdown } from "@/components/countdown";
import { StatusBadge } from "@/components/dashboard/status-badge";
import Link from "next/link";
import { Eye } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerWatchlistPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const watchlist = await getBuyerWatchlist(user.id);

  return (
    <DashboardShell title="Watchlist" subtitle="Lots you are following." nav={buyerNav} active="/buyer/watchlist">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Followed lots</CardTitle>
        </CardHeader>
        <CardContent>
          {watchlist.length === 0 ? (
            <EmptyState
              icon={<Eye className="h-8 w-8" aria-hidden />}
              title="Your watchlist is empty"
              description="Follow lots you're interested in to track them here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {watchlist.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <Link href={`/lots/${w.lot.id}`} className="font-semibold text-foreground transition-colors hover:text-accent">
                      {w.lot.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{w.lot.bidCount} bids</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold tabular-nums text-foreground">
                        {formatMoney(w.lot.currentBidMinor, w.lot.currency)}
                      </p>
                      <Countdown endAt={w.lot.endAt.toISOString()} urgent className="text-xs" />
                    </div>
                    <StatusBadge status={w.lot.status} />
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
