import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { DashboardShell, buyerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BidRow } from "@/components/dashboard/bid-row";
import { getBuyerBidsByStatus } from "@/server/readers/buyer";
import { BidStatus } from "@prisma/client";
import { Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerWinningPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const bids = await getBuyerBidsByStatus(user.id, BidStatus.WINNING);

  return (
    <DashboardShell title="Winning" subtitle="Bids currently in the lead." nav={buyerNav} active="/buyer/winning">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Currently winning</CardTitle>
        </CardHeader>
        <CardContent>
          {bids.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-8 w-8" aria-hidden />}
              title="Not winning anything right now"
              description="Place a bid to take the lead on a lot."
            />
          ) : (
            <ul className="divide-y divide-border">
              {bids.map((bid) => (
                <BidRow
                  key={bid.id}
                  lotId={bid.lot.id}
                  title={bid.lot.title}
                  amountMinor={bid.amountMinor}
                  currency={bid.currency}
                  status={bid.status}
                  endAt={bid.lot.endAt}
                  reserveMet={bid.lot.reserveMet}
                  reservePriceMinor={bid.lot.reservePriceMinor}
                  bidCount={bid.lot.bidCount}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
