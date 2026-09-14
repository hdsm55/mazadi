import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { BidPanel } from "@/components/bid-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { ShieldCheck, Truck, BadgeDollarSign, User, Share2, Eye, Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lot = await prisma.lot.findUnique({
    where: { id },
    include: { auction: true, category: true, seller: true, bids: { orderBy: { sequence: "desc" }, take: 20 } },
  });
  if (!lot) notFound();

  const user = await getSessionUser();
  const isLive = lot.status === "LIVE";

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* ===== Left: gallery + details ===== */}
      <div className="space-y-8 lg:col-span-2">
        {/* Gallery / media */}
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-accent/70 shadow-lift">
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_30%_25%,hsl(var(--accent)/0.6),transparent_50%),radial-gradient(circle_at_75%_75%,hsl(var(--accent)/0.4),transparent_45%)]" />
          <span className="font-serif text-[9rem] font-semibold leading-none text-primary-foreground/90 md:text-[12rem]">
            {lot.title.charAt(0)}
          </span>
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <Badge variant={isLive ? "success" : "secondary"} className="gap-1.5">
              {isLive && <span className="live-dot" aria-hidden />}
              {lot.status}
            </Badge>
            {lot.category?.name && <Badge variant="gold">{lot.category.name}</Badge>}
          </div>
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50"
              aria-label="Watch"
            >
              <Eye className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Title + seller */}
        <div className="space-y-4">
          <h1 className="font-serif text-3xl font-semibold leading-tight text-foreground md:text-4xl">
            {lot.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
              <User className="h-4 w-4 text-accent" aria-hidden />
              {lot.seller.name}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Verified seller
            </span>
            <span className="text-sm text-muted-foreground">Condition: {lot.condition}</span>
          </div>
          <p className="max-w-2xl text-muted-foreground">{lot.description}</p>
        </div>

        {/* Key facts */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: BadgeDollarSign, label: "Starting price", value: formatMoney(lot.startingPriceMinor, lot.currency) },
            { icon: Package, label: "Condition", value: lot.condition },
            { icon: Truck, label: "Shipping", value: "Worldwide" },
          ].map((f) => (
            <div key={f.label} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <f.icon className="mb-2 h-5 w-5 text-accent" aria-hidden />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{f.label}</p>
              <p className="mt-0.5 font-semibold text-foreground">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Bid history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Bid History</CardTitle>
          </CardHeader>
          <CardContent>
            {lot.bids.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bids yet. Be the first to place a bid.</p>
            ) : (
              <ul className="divide-y divide-border">
                {lot.bids.map((bid) => (
                  <li key={bid.id} className="flex items-center justify-between py-3 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-mono text-xs">#{bid.sequence}</span>
                      <Badge variant={bid.type === "AUTO" ? "gold" : "secondary"}>{bid.type}</Badge>
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatMoney(bid.amountMinor, bid.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Right: bid panel ===== */}
      <div className="lg:col-span-1">
        <BidPanel
          lotId={lot.id}
          userId={user?.id ?? null}
          isSeller={user?.id === lot.sellerId}
          initial={{
            currentBidMinor: lot.currentBidMinor,
            currentBidderId: lot.currentBidderId,
            bidCount: lot.bidCount,
            reserveMet: lot.reserveMet,
            endAt: lot.endAt.toISOString(),
            status: lot.status,
          }}
        />
      </div>
    </div>
  );
}
