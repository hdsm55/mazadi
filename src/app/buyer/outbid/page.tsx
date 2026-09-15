import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { DashboardShell, buyerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BidRow } from "@/components/dashboard/bid-row";
import { getBuyerBidsByStatus } from "@/server/readers/buyer";
import { BidStatus } from "@prisma/client";
import { Gavel } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerOutbidPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const bids = await getBuyerBidsByStatus(user.id, BidStatus.OUTBID);

  return (
    <DashboardShell title="Outbid" subtitle="Bids that have been beaten by another bidder." nav={buyerNav} active="/buyer/outbid">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Outbid lots</CardTitle>
        </CardHeader>
        <CardContent>
          {bids.length === 0 ? (
            <EmptyState
              icon={<Gavel className="h-8 w-8" aria-hidden />}
              title="No outbid lots"
              description="You're holding the lead on all your active bids."
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
