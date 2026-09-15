import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { Countdown } from "@/components/countdown";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cn } from "@/lib/utils";

// A single bid row for the buyer dashboard. Shows the big price, live
// countdown, reserve state and status in a clear, premium layout.

export function BidRow({
  lotId,
  title,
  amountMinor,
  currency,
  status,
  endAt,
  reserveMet,
  reservePriceMinor,
  bidCount,
}: {
  lotId: string;
  title: string;
  amountMinor: number;
  currency: string;
  status: string;
  endAt: Date;
  reserveMet: boolean;
  reservePriceMinor: number | null;
  bidCount: number;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <Link href={`/lots/${lotId}`} className="font-semibold text-foreground transition-colors hover:text-accent">
          {title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="tabular-nums">{bidCount} bids</span>
          {reservePriceMinor !== null && (
            <span className={cn("tabular-nums", reserveMet ? "text-success" : "text-warning")}>
              {reserveMet ? "Reserve met" : "Reserve not met"}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-foreground">{formatMoney(amountMinor, currency)}</p>
          <Countdown endAt={endAt.toISOString()} urgent className="text-xs" />
        </div>
        <StatusBadge status={status} />
      </div>
    </li>
  );
}
