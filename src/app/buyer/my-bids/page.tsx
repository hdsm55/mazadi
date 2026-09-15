import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { DashboardShell, buyerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BidRow } from "@/components/dashboard/bid-row";
import { getBuyerBids } from "@/server/readers/buyer";
import { Gavel } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerMyBidsPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const bids = await getBuyerBids(user.id);

  return (
    <DashboardShell title="My Bids" subtitle="Every bid you have placed across all auctions." nav={buyerNav} active="/buyer/my-bids">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All bids</CardTitle>
        </CardHeader>
        <CardContent>
          {bids.length === 0 ? (
            <EmptyState
              icon={<Gavel className="h-8 w-8" aria-hidden />}
              title="No bids yet"
              description="Browse live auctions and place your first bid."
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
